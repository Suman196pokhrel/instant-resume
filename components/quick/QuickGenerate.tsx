"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BookOpen, Briefcase, Check, FileText, KeyRound, Pencil, ShieldCheck, Sparkles, TriangleAlert, X, Zap } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Chip, Pill } from "@/components/ui/pill";
import { createPipeline, STAGE_IDS, stageLabels, type DocFinding, type StageStatus } from "@/lib/generate/pipeline";
import { getAdapter } from "@/lib/llm/adapter";
import { mockScenario } from "@/lib/llm/mock";
import { useLlmChoice } from "@/lib/llm/use-choice";
import { prefersReducedMotion } from "@/lib/motion";
import type { JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { SampleJd } from "@/lib/dev-samples";
import type { Prefs } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";
import { QuickResult, type QuickDone } from "./QuickResult";
import { employer, roleAt } from "@/lib/doc/filename";

// Quick generate (SPEC §14.3; mock views-quick.js): paste a job description, watch the five-stage pipeline, then
// open the result. The pipeline is lib/generate/pipeline.ts; this screen only listens to its events.

export const QUICK_DRAFT = "instant-resume-quick-draft";
type Draft = { jdText: string; notes: string };
const noop = () => () => {};
function loadDraft(): Draft {
  try {
    const d = JSON.parse(localStorage.getItem(QUICK_DRAFT) ?? "null");
    return { jdText: typeof d?.jdText === "string" ? d.jdText : "", notes: typeof d?.notes === "string" ? d.notes : "" };
  } catch {
    return { jdText: "", notes: "" };
  }
}
function saveDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(QUICK_DRAFT, JSON.stringify(d));
    else localStorage.removeItem(QUICK_DRAFT);
  } catch {
    // storage blocked: the draft lasts until reload
  }
}

type Stage = { status: StageStatus | "pending"; note?: string };
type Run = {
  stages: Stage[];
  pct: number;
  brief?: JobBrief;
  match?: { matched: string[]; skills: string[]; gaps: string[] };
  drafts: { kind: "summary" | "bullet" | "letter"; text: string }[];
  pages: { kind: string; value: number; action: string; done: boolean }[];
  checks?: { coverage: number; findings: DocFinding[]; gaps: string[] };
  error?: { index: number; label: string; reason: string };
};
const fresh = (): Run => ({ stages: STAGE_IDS.map(() => ({ status: "pending" })), pct: 0, drafts: [], pages: [] });
const SR: Record<Stage["status"], string> = { pending: "Not started", active: "In progress", done: "Done", warning: "Needs review", error: "Failed" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function QuickGenerate({ kb, prefs, samples = null }: { kb: KnowledgeBase; prefs: Prefs; samples?: SampleJd[] | null }) {
  const { connections, active } = useLlmChoice();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [edited, setDraft] = useState<Draft | null>(null);
  const [short, setShort] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [said, setSaid] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<QuickDone | null>(null);
  const [kbNow, setKbNow] = useState(kb); // Regenerate reads the KB again, so facts added from the result are used
  const input = useRef<Draft>({ jdText: "", notes: "" }); // the run's own text: the stored draft is cleared on success
  const replaces = useRef<string | null>(null);
  const pipeline = useRef<ReturnType<typeof createPipeline> | null>(null);
  const clock = useRef<{ start: number; timer?: ReturnType<typeof setInterval> }>({ start: 0 });
  const retry = useRef<HTMLButtonElement>(null);
  const labels = stageLabels(prefs);
  const q = prefs.quick;
  useEffect(() => () => (pipeline.current?.cancel(), clearInterval(clock.current.timer)), []);
  useEffect(() => {
    if (run?.error) retry.current?.focus();
  }, [run?.error]);

  const d = edited ?? (hydrated ? loadDraft() : null);
  if (!d) return null;
  const update = (patch: Partial<Draft>) => {
    const next = { ...d, ...patch };
    saveDraft(next);
    setDraft(next);
  };
  const tick = (on: boolean) => {
    clearInterval(clock.current.timer);
    if (on) clock.current.timer = setInterval(() => setElapsed((performance.now() - clock.current.start) / 1000), 100);
  };

  function start(kb = kbNow, text: Draft = d!) {
    if (text.jdText.trim().length < 80) return setShort("That looks too short to be a full job description. Paste the whole ad, including the requirements.");
    setShort("");
    input.current = text;
    const scenario = process.env.NEXT_PUBLIC_LLM_MOCK === "1" ? mockScenario() : "happy";
    let brief: JobBrief | undefined;
    const p = createPipeline(text, {
      kb,
      prefs,
      getAdapter,
      failOnce: scenario.startsWith("error-stage-") ? +scenario.slice(-1) - 1 : undefined,
      compile: async (kind, document) => {
        const { render } = await import("@/lib/render/client");
        return (await render(kind, { document, kb: { contact: kb.contact, workRights: kb.workRights }, brief: { title: brief?.title ?? "" }, paper: prefs.paper, spelling: prefs.spelling }, "pdf")).pages;
      },
      save: async (project, documents) => {
        const res = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, documents }) });
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()).project.id as string;
      },
    });
    const set = (change: (r: Run) => Partial<Run>) => setRun((r) => (r ? { ...r, ...change(r) } : r));
    p.on("stage", (e) => {
      set((r) => ({ stages: r.stages.map((s, i) => (i === e.index ? { status: e.status, note: e.note } : s)) }));
      setSaid(`${e.label}: ${SR[e.status]}${e.note ? `. ${e.note}` : ""}`);
    });
    p.on("progress", (e) => set(() => ({ pct: Math.round(e.value * 100) })));
    p.on("brief", (e) => ((brief = e.brief), set(() => ({ brief: e.brief }))));
    p.on("match", (e) => set(() => ({ match: e })));
    p.on("draft", (e) => set((r) => ({ drafts: [...r.drafts, e] })));
    p.on("pages", (e) => set((r) => ({ pages: [...r.pages.filter((x) => x.kind !== e.kind), e] })));
    p.on("checks", (e) => set(() => ({ checks: e })));
    p.on("error", (e) => {
      tick(false);
      set(() => ({ error: e }));
    });
    p.on("done", (e) => {
      tick(false);
      saveDraft(null);
      const old = replaces.current;
      replaces.current = null;
      if (old) void fetch(`/api/projects/${old}`, { method: "DELETE" }); // Regenerate replaces the project it came from
      setDone({ projectId: e.projectId, summary: e.summary, docs: e.docs, brief: brief!, seconds: (performance.now() - clock.current.start) / 1000, model: active?.model ?? "your model" });
      setRun(null);
    });
    pipeline.current = p;
    setRun(fresh());
    setElapsed(0);
    clock.current.start = performance.now();
    tick(true);
    void p.run();
  }

  function retryFrom(i: number) {
    // Retry drops the cards from the failed stage on and runs again from there
    setRun((r) => r && { ...r, error: undefined, stages: r.stages.map((s, k) => (k >= i ? { status: "pending" } : s)), ...(i <= 1 ? { match: undefined } : {}), ...(i <= 2 ? { drafts: [] } : {}), ...(i <= 3 ? { pages: [] } : {}), checks: undefined });
    tick(true);
    void pipeline.current?.run(i);
  }
  function stop(toastIt: boolean) {
    pipeline.current?.cancel();
    pipeline.current = null;
    tick(false);
    setRun(null);
    if (toastIt) toast("Generation cancelled. Your job description is still here.");
  }

  async function regenerate() {
    const old = done?.projectId ?? null;
    let fresh = kbNow;
    try {
      const res = await fetch("/api/kb");
      if (res.ok) fresh = await res.json();
    } catch {
      // offline: regenerate from the KB we have
    }
    setKbNow(fresh);
    replaces.current = old;
    setDone(null);
    start(fresh, input.current);
  }

  if (done) return <QuickResult done={done} kb={kbNow} prefs={prefs} onRegenerate={regenerate} />;

  if (!run)
    return (
      <section className="mx-auto max-w-[780px] rounded-lg border border-line bg-surface p-6 shadow-card max-[900px]:px-4 max-[900px]:py-[18px]">
        <h1 className="text-[22px]">Paste a job description</h1>
        <p className="mt-1 text-muted-foreground">{`You'll get a tailored resume${q.coverLetter ? " and cover letter" : ""}, written only from facts in your knowledge base.`}</p>
        {!active && connections !== null && (
          <Callout variant="warn" className="mt-3.5">
            <KeyRound />
            <div>
              <strong>No API key connected.</strong> Generation runs on your own provider account. <Link href="/settings">Add a key in Settings</Link>
            </div>
          </Callout>
        )}
        <Field id="quick-jd" label={<span className="sr-only">Job description</span>} error={short} className="mt-3.5">
          <Textarea rows={14} value={d.jdText} onChange={(e) => update({ jdText: e.target.value })} placeholder="Paste the whole job ad here, including the requirements" className="min-h-[300px]" />
        </Field>
        <Field id="quick-notes" label="Notes for this application" optional className="mt-3">
          <Textarea rows={2} value={d.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Why you want this job, what to emphasise, who referred you" />
        </Field>
        <p className="mt-1 text-[13px] text-muted-foreground">Used as a fact you supplied, mostly in the cover letter. Nothing else is added.</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-muted-foreground tabular-nums">{`${d.jdText.length.toLocaleString("en-AU")} characters`}</span>
          <div className="flex flex-wrap gap-2">
            {samples?.length ? (
              <Button variant="ghost" onClick={() => update({ jdText: samples[(samples.findIndex((s) => s.text === d.jdText) + 1) % samples.length].text })}>
                Use sample job description
              </Button>
            ) : null}
            <Button onClick={() => start()} disabled={!active || !d.jdText.trim()}>
              <Sparkles /> Generate
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1 border-t border-line pt-3.5 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Zap aria-hidden className="size-3 text-primary" /> Uses your knowledge base and default theme. You can tweak everything afterwards.
          </span>
          <span>
            {`Defaults: ${q.theme.charAt(0).toUpperCase()}${q.theme.slice(1)} theme, ${plural(q.pages, "page")}, cover letter ${q.coverLetter ? `on (${q.tone.toLowerCase()} tone)` : "off"}. `}
            <Link href="/settings">Change defaults</Link>
          </span>
        </div>
      </section>
    );

  const title = run.brief ? `Generating for ${roleAt(run.brief.title, run.brief.company)}` : "Generating your documents";
  return (
    // mock .panel.qg-progress: the run sits on one card
    <section aria-labelledby="qg-title" className="mx-auto max-w-[980px] rounded-lg border border-line bg-surface p-6 shadow-card max-[900px]:px-4 max-[900px]:py-[18px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 id="qg-title" className="mb-0.5 text-[21px]">
            {title}
          </h1>
          <p className="text-[13px] text-muted-foreground">This usually takes about 15 seconds.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => stop(true)}>
          Cancel
        </Button>
      </div>
      <div className="mt-[18px] mb-[22px] flex items-center gap-3">
        <div role="progressbar" aria-label="Overall progress" aria-valuenow={run.pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-primary transition-[width] duration-(--t-slow) ease-(--ease)" style={{ width: `${run.pct}%` }} />
        </div>
        <span className="w-10 text-right text-[13px] font-medium tabular-nums">{run.pct}%</span>
        <span className="w-12 text-right text-[13px] text-muted-foreground tabular-nums">{elapsed.toFixed(1)}s</span>
      </div>
      <p role="status" className="sr-only">
        {said}
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-7 max-[860px]:grid-cols-1">
        <div>
          <ol aria-label="Stages" className="flex flex-col">
            {labels.map((label, i) => {
              const s = run.stages[i];
              return (
                <li key={label} data-state={s.status} className="relative grid grid-cols-[26px_1fr] gap-3 pb-5 last:pb-0">
                  {i < labels.length - 1 && <span aria-hidden className={cn("absolute top-[28px] bottom-0.5 left-[12.25px] w-[1.5px] bg-line", (s.status === "done" || s.status === "warning") && "bg-accent-line")} />}
                  <span
                    aria-hidden
                    className={cn(
                      "relative grid size-[26px] place-items-center rounded-full border-[1.5px] border-line-2 bg-surface",
                      s.status === "active" && "animate-spin border-accent-line border-t-primary",
                      s.status === "done" && "border-primary bg-primary text-primary-foreground",
                      s.status === "warning" && "border-warn-line bg-warn-soft text-warn",
                      s.status === "error" && "border-danger bg-danger text-primary-foreground"
                    )}
                  >
                    {s.status === "pending" && <span className="size-1 rounded-full bg-line-2" />}
                    {s.status === "done" && <Check className="size-3.5" strokeWidth={3} />}
                    {s.status === "warning" && <TriangleAlert className="size-3.5" />}
                    {s.status === "error" && <X className="size-3.5" strokeWidth={3} />}
                  </span>
                  <div className="pt-[3px]">
                    <div className={cn("text-sm text-ink-2", s.status === "active" && "font-semibold text-ink", s.status === "error" && "font-medium text-danger")}>
                      {label}
                      <span className="sr-only">{`, ${SR[s.status]}`}</span>
                    </div>
                    {s.note && <div className={cn("mt-0.5 animate-in text-[13px] duration-(--t) fade-in-0", s.status === "warning" ? "text-warn" : s.status === "error" ? "text-danger" : "text-muted-foreground")}>{s.note}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
          {run.error && (
            <div role="alert" className="mt-5 grid grid-cols-[16px_1fr] gap-x-2.5 rounded-lg border border-danger-line bg-danger-soft p-3.5 text-[13px]">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 text-danger" />
              <strong className="block text-sm">{`Stopped at "${run.error.label}"`}</strong>
              <p className="col-start-2 mt-1 text-ink-2">{`${run.error.reason} The steps before this one are kept.`}</p>
              <div className="col-start-2 mt-3 flex gap-2">
                <Button ref={retry} size="sm" onClick={() => retryFrom(run.error!.index)}>
                  Retry from this step
                </Button>
                <Button size="sm" variant="ghost" onClick={() => stop(false)}>
                  Start over
                </Button>
              </div>
            </div>
          )}
        </div>
        <Results run={run} name={kb.contact.name} budget={q.pages} />
      </div>
    </section>
  );
}

/** Chips enter one after another (SPEC §12 "Quick generate chips"). */
const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** A live-results card that scrolls into view when it appears. */
function Card({ title, icon: Icon, children, done }: { title: string; icon: typeof Check; children: React.ReactNode; done?: boolean }) {
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    el.current?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" }); // a block body: Chrome returns a promise, which React would take for a cleanup
  }, []);
  return (
    <section ref={el} aria-label={title} className={cn("animate-in rounded-md border border-line bg-surface-2 px-3.5 py-3 duration-(--t) ease-(--ease) fade-in-0 slide-in-from-bottom-1", done && "border-accent-line")}>
      <h2 className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2">
        <Icon aria-hidden className="size-3.5 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Results({ run, name, budget }: { run: Run; name: string; budget: 1 | 2 }) {
  const { brief, match, drafts, pages, checks } = run;
  if (!brief)
    return <div className="grid min-h-[200px] place-items-center rounded-lg border border-dashed border-line-2 p-6 text-center text-[13px] text-muted-foreground">Results appear here as each step finishes.</div>;
  const gaps = new Set(match?.gaps ?? []);
  const summary = drafts.find((x) => x.kind === "summary");
  const bullets = drafts.filter((x) => x.kind === "bullet");
  const letter = drafts.find((x) => x.kind === "letter");
  const resumePages = pages.find((p) => p.kind === "resume");
  return (
    <div className="flex flex-col gap-3">
      <Card title="Job brief" icon={Briefcase}>
        <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <strong className="text-[15px]">{brief.title}</strong>
          <span className="text-muted-foreground">{[employer(brief.company), brief.location].filter(Boolean).join(", ")}</span>
          <Pill>{brief.seniority}</Pill>
        </div>
        <div className="text-xs font-semibold text-ink-2">Must-haves</div>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {brief.requirements.slice(0, 6).map((r, k) => (
            <li key={r} className="animate-qg-chip" style={stagger(k)}>
              <Chip className={cn(match && (gaps.has(r) ? "border-warn-line bg-warn-soft text-warn" : "border-accent-line bg-accent-soft text-accent-ink"))}>
                {match && (gaps.has(r) ? <TriangleAlert aria-hidden className="size-3" /> : <Check aria-hidden className="size-3" />)}
                {match && <span className="sr-only">{gaps.has(r) ? "Gap: " : "Matched: "}</span>}
                {r}
              </Chip>
            </li>
          ))}
        </ul>
      </Card>
      {match && (
        <Card title="Matched from your knowledge base" icon={BookOpen}>
          <ul className="flex flex-wrap gap-1.5">
            {[...match.matched, ...match.skills].map((m, k) => (
              <li key={m} className="animate-qg-chip" style={stagger(k)}>
                <Chip className="border-accent-line bg-accent-soft text-accent-ink">
                  <Check aria-hidden className="size-3" />
                  {m}
                </Chip>
              </li>
            ))}
          </ul>
          {match.gaps.length > 0 && (
            <>
              <div className="mt-2.5 flex items-center gap-1.5 text-[13px] font-medium text-warn">
                <TriangleAlert aria-hidden className="size-3.5" /> {`${plural(match.gaps.length, "gap")}: no supporting evidence`}
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {match.gaps.map((g, k) => (
                  <li key={g} className="animate-qg-chip" style={stagger(k + match.matched.length + match.skills.length)}>
                    <Chip className="border-warn-line bg-warn-soft text-warn">{g}</Chip>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-muted-foreground">These are flagged on the result, not blocking. You can still download.</p>
            </>
          )}
        </Card>
      )}
      {summary && (
        <Card title="Draft" icon={Pencil}>
          <div className="rounded-sm border border-line bg-surface px-4 py-3 font-sample-liberation text-[11.5px] leading-[1.45] shadow-card">
            <div className="text-[15px] font-bold">{name}</div>
            <div className="mt-2 font-bold text-primary">Summary</div>
            <p>{summary.text}</p>
            {bullets.length > 0 && <div className="mt-2 font-bold text-primary">Experience</div>}
            <ul className="list-disc pl-4">
              {bullets.slice(0, 6).map((b) => (
                <li key={b.text} className="animate-in duration-(--t) fade-in-0">
                  {b.text}
                </li>
              ))}
            </ul>
            {letter && (
              <>
                <div className="mt-2 font-bold text-primary">Cover letter</div>
                <p>{letter.text}</p>
              </>
            )}
          </div>
        </Card>
      )}
      {resumePages && (
        <Card title="Page fit" icon={FileText} done={resumePages.done && resumePages.value <= budget}>
          <div className="flex items-baseline gap-2">
            <span key={resumePages.value} className="inline-block animate-qg-tick text-3xl font-semibold tabular-nums">
              {resumePages.value}
            </span>
            <span className="text-muted-foreground">{resumePages.value === 1 ? "page" : "pages"}</span>
            {resumePages.done && resumePages.value <= budget && <Check aria-label="Fits" className="size-4 text-primary" />}
          </div>
          <div className="text-[13px] text-muted-foreground">{resumePages.action}</div>
        </Card>
      )}
      {checks && (
        <Card title="Checks" icon={ShieldCheck}>
          <ul className="flex flex-col gap-1 text-[13px]">
            <li className={cn(checks.coverage < 60 && "text-warn")}>{`${checks.coverage}% keyword coverage`}</li>
            <li className={cn(checks.gaps.length > 0 && "text-warn")}>{plural(checks.gaps.length, "gap")}</li>
            <li className={cn(checks.findings.length > 0 && "text-warn")}>{plural(checks.findings.length, "finding")}</li>
          </ul>
        </Card>
      )}
    </div>
  );
}
