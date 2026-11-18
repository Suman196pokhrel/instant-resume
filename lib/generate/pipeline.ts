import { extractBrief } from "@/lib/brief/extract";
import { runChecks, type Finding } from "@/lib/checks/run";
import { fitPages } from "@/lib/generate/fit";
import { generateDocuments } from "@/lib/generate/generate";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { LlmError } from "@/lib/llm/errors";
import { matchEvidence, type Match } from "@/lib/match/evidence";
import { entryText, matchedKeywords } from "@/lib/match/keywords";
import type { JobBrief } from "@/lib/schemas/brief";
import type { ResumeDocument } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Project } from "@/lib/schemas/project";
import type { Prefs } from "@/lib/schemas/settings";

// Quick generate (SPEC §14.3): five stages as an event emitter, so the UI only listens. The context survives a
// failure, so Retry runs again from the failed stage with the earlier results kept. Nothing is saved until all
// five succeed.

export type StageId = "read" | "match" | "write" | "fit" | "check";
export type StageStatus = "active" | "done" | "warning" | "error";
type Kind = ResumeDocument["kind"];
type Doc = Omit<ResumeDocument, "id" | "projectId">;
export type DocFinding = Finding & { doc: Kind };
export type QuickSummary = { coverage: number; findings: DocFinding[]; gaps: string[]; pages: Partial<Record<Kind, number>> };
export type PipelineEvent =
  | { type: "stage"; index: number; id: StageId; label: string; status: StageStatus; note?: string }
  | { type: "progress"; value: number }
  | { type: "brief"; brief: JobBrief }
  | { type: "match"; matched: string[]; skills: string[]; gaps: string[] }
  | { type: "draft"; kind: "summary" | "bullet" | "letter"; text: string }
  | { type: "pages"; kind: Kind; value: number; action: string; done: boolean; budget: 1 | 2 }
  | { type: "checks"; coverage: number; findings: DocFinding[]; gaps: string[] }
  | { type: "done"; projectId: string; summary: QuickSummary; docs: Doc[] }
  | { type: "error"; index: number; label: string; reason: string; error?: LlmError };
type ByType<T extends PipelineEvent["type"]> = Extract<PipelineEvent, { type: T }>;

export type ProjectIn = Omit<Project, "id" | "schemaVersion" | "createdAt" | "updatedAt">;
export type PipelineDeps = {
  kb: KnowledgeBase;
  prefs: Prefs;
  getAdapter: () => Promise<LlmAdapter>;
  /** Compiles a document to PDF and returns its page count. */
  compile: (kind: Kind, doc: Doc) => Promise<number>;
  save: (project: ProjectIn, documents: Doc[]) => Promise<string>;
  /** Demo and tests (?mock=error-stage-N): this stage fails once. */
  failOnce?: number;
};

export const STAGE_IDS: StageId[] = ["read", "match", "write", "fit", "check"];
export function stageLabels(prefs: Prefs): string[] {
  const n = prefs.quick.pages;
  return ["Reading the job description", "Matching your experience", prefs.quick.coverLetter ? "Writing your resume and cover letter" : "Writing your resume", `Fitting to ${n} ${n === 1 ? "page" : "pages"}`, "Running checks"];
}
const REASONS = [
  "The text couldn't be read as a job description. Check you pasted the whole ad as plain text.",
  "Your knowledge base couldn't be loaded from the local database.",
  "The model couldn't write the documents.",
  "The renderer stopped while laying out page 2.",
  "Checks stopped before they finished.",
];
const pages = (n: number) => `${n} ${n === 1 ? "page" : "pages"}`;

/** Quick generate's coverage finding (SPEC §10.1): below 60%, naming up to three keywords the resume misses. */
export function coverageFinding(coverage: number, missing: string[], sectionId: string): DocFinding | null {
  if (coverage >= 60) return null;
  const kws = missing.slice(0, 3);
  const list = kws.length > 1 ? `${kws.slice(0, -1).join(", ")} and ${kws.at(-1)}` : (kws[0] ?? "Keywords");
  return { type: "coverage", doc: "resume", sectionId, title: `Keyword coverage is ${coverage}%`, detail: `${list} from the job brief ${kws.length === 1 ? "doesn't" : "don't"} appear in the resume.` };
}

export function createPipeline(input: { jdText: string; notes: string }, deps: PipelineDeps) {
  const { kb, prefs } = deps;
  const listeners = new Map<string, Set<(e: never) => void>>();
  const labels = stageLabels(prefs);
  const ctx: { brief?: JobBrief; match?: Match; docs?: Doc[]; pages?: Partial<Record<Kind, number>>; summary?: QuickSummary } = {};
  let controller = new AbortController();
  let failOnce = deps.failOnce;
  let progress = 0;

  function emit(e: PipelineEvent) {
    if (controller.signal.aborted) return;
    listeners.get(e.type)?.forEach((fn) => (fn as (e: PipelineEvent) => void)(e));
  }
  const advance = (value: number) => {
    progress = Math.max(progress, Math.min(1, value)); // never moves back, even on a retry
    emit({ type: "progress", value: progress });
  };

  const work: ((i: number) => Promise<{ status?: StageStatus; note: string }>)[] = [
    async () => {
      ctx.brief = await extractBrief(input.jdText, await deps.getAdapter(), controller.signal);
      emit({ type: "brief", brief: ctx.brief });
      return { note: `${ctx.brief.requirements.length} must-haves, ${ctx.brief.keywords.length} keywords` };
    },
    async () => {
      const brief = ctx.brief!;
      ctx.match = await matchEvidence(brief, kb, await deps.getAdapter(), controller.signal);
      const chosen = new Set(ctx.match.selected);
      const entries = [...kb.roles, ...(kb.volunteering ?? []), ...kb.portfolio, ...kb.credentials].filter((e) => chosen.has(e.id) && matchedKeywords(entryText(e), brief.keywords).length);
      const matched = entries.map((e) => ("company" in e ? `${e.title}, ${e.company}` : "name" in e ? e.name : e.title)).slice(0, 4);
      const skills = matchedKeywords(kb.skills.flatMap((g) => g.items).join(" | "), brief.keywords).slice(0, 5);
      const { gaps } = ctx.match;
      emit({ type: "match", matched, skills, gaps });
      return gaps.length ? { status: "warning", note: `${gaps.length} must-haves have no evidence in your knowledge base` } : { note: `${entries.length} entries and ${skills.length} skills match` };
    },
    async () => {
      const out = await generateDocuments({ kb, brief: ctx.brief!, selected: ctx.match!.selected, notes: input.notes, tone: prefs.quick.tone, spelling: prefs.spelling }, await deps.getAdapter(), controller.signal);
      ctx.docs = prefs.quick.coverLetter ? [out.resume, out.coverLetter] : [out.resume];
      for (const s of out.resume.sections) {
        if (s.kind === "summary" && "text" in s) emit({ type: "draft", kind: "summary", text: s.text });
        if (s.kind === "experience" && "items" in s) for (const b of s.items.flatMap((it) => it.bullets ?? [])) emit({ type: "draft", kind: "bullet", text: b.text });
      }
      const opening = out.coverLetter.sections[0];
      if (prefs.quick.coverLetter && opening && "text" in opening) emit({ type: "draft", kind: "letter", text: opening.text });
      return { note: `${out.count} changes, all validated` };
    },
    async () => {
      const budget = prefs.quick.pages;
      const [resume, letter] = ctx.docs!;
      const fit = await fitPages(resume, { budget, keywords: ctx.brief!.keywords, compile: (d) => deps.compile("resume", d), onStep: (s) => emit({ type: "pages", kind: "resume", ...s, budget }), signal: controller.signal });
      ctx.docs = letter ? [fit.doc, letter] : [fit.doc];
      ctx.pages = { resume: fit.pages };
      if (letter) {
        ctx.pages.coverLetter = await deps.compile("coverLetter", letter);
        if (controller.signal.aborted) throw new DOMException("cancelled", "AbortError");
        emit({ type: "pages", kind: "coverLetter", value: ctx.pages.coverLetter, action: `Laid out on ${prefs.paper}`, done: true, budget: 1 });
      }
      if (!fit.fits) return { status: "warning", note: `Still ${fit.pages} pages. Trim content in Studio.` };
      const p = ctx.pages;
      return { note: [`Resume ${pages(p.resume!)}`, p.coverLetter ? `cover letter ${pages(p.coverLetter)}` : ""].filter(Boolean).join(", ") };
    },
    async () => {
      const brief = ctx.brief!;
      const findings = ctx.docs!.flatMap((d) => runChecks(d, brief, kb, input.notes).findings.map((f) => ({ ...f, doc: d.kind })));
      const resume = runChecks(ctx.docs![0], brief, kb, input.notes);
      const coverage = Math.round((resume.matched.length / Math.max(1, brief.keywords.length)) * 100);
      const low = coverageFinding(coverage, resume.missing.map((m) => m.keyword), ctx.docs![0].sections[0]?.id ?? "");
      if (low) findings.push(low);
      const gaps = ctx.match!.gaps;
      ctx.summary = { coverage, findings, gaps, pages: ctx.pages! };
      emit({ type: "checks", coverage, findings, gaps });
      return findings.length ? { status: "warning", note: `${findings.length} findings to review` } : { note: gaps.length ? "No findings" : "No issues found" };
    },
  ];

  async function run(from = 0) {
    controller = new AbortController();
    const signal = controller.signal;
    for (let i = from; i < work.length; i++) {
      const id = STAGE_IDS[i];
      emit({ type: "stage", index: i, id, label: labels[i], status: "active" });
      advance(i / work.length);
      try {
        if (failOnce === i) {
          failOnce = undefined;
          throw new Error(REASONS[i]);
        }
        const { status = "done", note } = await work[i](i);
        if (signal.aborted) return;
        advance((i + 1) / work.length - (i === work.length - 1 ? 0.02 : 0)); // the last step leaves room for the save
        emit({ type: "stage", index: i, id, label: labels[i], status, note });
      } catch (e) {
        if (signal.aborted) return;
        const reason = e instanceof LlmError ? [e.title, e.message].filter(Boolean).join(". ").replace(/\.\./g, ".") : REASONS[i];
        emit({ type: "stage", index: i, id, label: labels[i], status: "error", note: reason });
        emit({ type: "error", index: i, label: labels[i], reason, error: e instanceof LlmError ? e : undefined });
        return;
      }
    }
    const brief = ctx.brief!;
    try {
      const projectId = await deps.save(
        { company: brief.company, role: brief.title, location: brief.location, jdText: input.jdText, brief, selected: ctx.match!.selected, source: "quick", gaps: ctx.match!.gaps, notes: input.notes.trim() || undefined, ...(prefs.quick.coverLetter ? {} : { coverLetterOff: true }) },
        ctx.docs!
      );
      if (signal.aborted) return;
      advance(1);
      emit({ type: "done", projectId, summary: ctx.summary!, docs: ctx.docs! });
    } catch {
      if (signal.aborted) return;
      emit({ type: "error", index: work.length - 1, label: labels[work.length - 1], reason: "Saving the project failed." });
    }
  }

  return {
    on<T extends PipelineEvent["type"]>(type: T, fn: (e: ByType<T>) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn as (e: never) => void);
      return () => listeners.get(type)!.delete(fn as (e: never) => void);
    },
    run,
    cancel: () => controller.abort(),
  };
}
