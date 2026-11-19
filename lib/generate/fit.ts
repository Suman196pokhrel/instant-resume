import { matchedKeywords } from "@/lib/match/keywords";
import type { ResumeDocument, Section } from "@/lib/schemas/document";

// Page fitting (SPEC §9.4): a deterministic loop of at most 24 compiles. After each compile that runs over the
// budget, the next adjustment that can still change the document is applied, in a fixed order and within floors.
// Content steps repeat (one bullet or sentence per compile) until they run out, so a long resume still gets there.

type Doc = Omit<ResumeDocument, "id" | "projectId">;
export type FitStep = { value: number; action: string; done: boolean };
type Opts = { budget: 1 | 2; keywords: string[]; compile: (doc: Doc) => Promise<number>; onStep?: (s: FitStep) => void; signal?: AbortSignal };

export const MAX_COMPILES = 24;
const round = (n: number) => Math.round(n * 100) / 100;

/** Lowers one theme value by a step, never below its floor; null when it's already there. */
const lower = (key: "lineHeight" | "sectionGap" | "margin" | "baseSize", by: number, floor: number) => (d: Doc) =>
  d.theme[key] <= floor ? null : { ...d, theme: { ...d.theme, [key]: round(Math.max(floor, d.theme[key] - by)) } };

/** Drops the least relevant bullet: fewest keyword matches, oldest role first (the last item), keeping `keep` per role. */
function dropBullet(keywords: string[], keep = 2) {
  return (d: Doc) => {
    let best: { s: number; i: number; b: number; score: number } | null = null;
    d.sections.forEach((s, si) => {
      if (s.hidden || s.kind !== "experience" || !("items" in s)) return;
      s.items.forEach((it, ii) => {
        const bs = it.bullets ?? [];
        if (bs.length <= keep) return;
        bs.forEach((b, bi) => {
          const score = matchedKeywords(b.text, keywords).length;
          if (!best || score < best.score || (score === best.score && (ii > best.i || (ii === best.i && bi > best.b)))) best = { s: si, i: ii, b: bi, score };
        });
      });
    });
    if (!best) return null;
    const { s: si, i: ii, b: bi } = best;
    return {
      ...d,
      sections: d.sections.map((s, k) => (k === si && "items" in s ? { ...s, items: s.items.map((it, m) => (m === ii ? { ...it, bullets: it.bullets!.filter((_, n) => n !== bi) } : it)) } : s)) as Section[],
    };
  };
}

/** Drops the last sentence of a text section, keeping its first; null when none has two sentences. */
const sentences = (t: string) => t.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((x) => x.trim()) ?? [];
function shorten(pick: (d: Doc) => number) {
  return (d: Doc) => {
    const i = pick(d);
    const s = d.sections[i];
    if (i < 0 || !("text" in s) || sentences(s.text).length < 2) return null;
    return { ...d, sections: d.sections.map((x, k) => (k === i ? { ...s, text: sentences(s.text).slice(0, -1).join(" ") } : x)) };
  };
}
const shortenSummary = shorten((d) => d.sections.findIndex((s) => s.kind === "summary" && !s.hidden));
/** The cover letter's longest paragraph that still has two sentences. */
const shortenParagraph = shorten((d) => {
  const ok = d.sections.map((s, i) => [s, i] as const).filter(([s]) => s.kind === "paragraph" && !s.hidden && "text" in s && sentences(s.text).length > 1);
  return ok.sort(([a], [b]) => ("text" in b ? b.text.length : 0) - ("text" in a ? a.text.length : 0))[0]?.[1] ?? -1;
});

const hide = (kinds: Set<string>) => (d: Doc) =>
  d.sections.some((s) => kinds.has(s.kind) && !s.hidden) ? { ...d, sections: d.sections.map((s) => (kinds.has(s.kind) ? { ...s, hidden: true } : s)) } : null;

/** Keeps only the skills the job asks for; a group with none goes. Never empties the Skills section. */
function trimSkills(keywords: string[]) {
  return (d: Doc) => {
    let changed = false;
    const sections = d.sections.map((s) => {
      if (s.kind !== "skills" || s.hidden || !("items" in s)) return s;
      const items = s.items.flatMap((it) => {
        const all = (it.line ?? "").split(/,\s*/).filter(Boolean);
        const kept = all.filter((x) => matchedKeywords(x, keywords).length > 0);
        if (kept.length === all.length) return [it];
        changed = true;
        return kept.length ? [{ ...it, line: kept.join(", ") }] : [];
      });
      return items.length ? { ...s, items } : s;
    }) as Section[];
    return changed && sections.some((s) => s.kind === "skills" && "items" in s && s.items.length) ? { ...d, sections } : null;
  };
}

type Step = [label: string, apply: (d: Doc) => Doc | null, repeat?: boolean];

export async function fitPages(start: Doc, { budget, keywords, compile, onStep, signal }: Opts): Promise<{ doc: Doc; pages: number; fits: boolean }> {
  const one = budget === 1;
  const steps: Step[] = [
    ["Tightening line spacing", lower("lineHeight", 0.05, 1.15)],
    ["Reducing space between sections", lower("sectionGap", 2, 6)],
    ["Narrowing the margins", lower("margin", 2, 12)],
    ["Reducing the text size", lower("baseSize", 0.5, 9.5)],
    ...(one ? ([["Hiding Portfolio, Certifications and Referees", hide(new Set(["portfolio", "credentials", "referees"]))]] as Step[]) : []),
    ...(one ? ([["Keeping the skills this job asks for", trimSkills(keywords)]] as Step[]) : []),
    ["Dropping the least relevant bullet", dropBullet(keywords), true],
    ["Shortening the summary", shortenSummary, true],
    ["Shortening the longest paragraph", shortenParagraph, true],
    ...(one ? ([["Hiding additional sections", hide(new Set(["additional"]))]] as Step[]) : []),
    ...(one ? ([["Keeping one bullet per role", dropBullet(keywords, 1), true]] as Step[]) : []),
  ];
  let doc = start;
  let action = "Laid out at the template defaults";
  let next = 0;
  for (let compiles = 1; ; compiles++) {
    const pages = await compile(doc);
    if (signal?.aborted) throw new DOMException("cancelled", "AbortError");
    onStep?.({ value: pages, action, done: false });
    if (pages <= budget) {
      onStep?.({ value: pages, action: `Fits on ${pages} ${pages === 1 ? "page" : "pages"}`, done: true });
      return { doc, pages, fits: true };
    }
    let changed: Doc | null = null;
    while (!changed && next < steps.length && compiles < MAX_COMPILES) {
      const [label, apply, repeat] = steps[next];
      [action, changed] = [label, apply(doc)];
      if (!changed || !repeat) next++; // a repeating step stays current until it has nothing left to take
    }
    if (!changed) return { doc, pages, fits: false };
    doc = changed;
  }
}

/** A fresh pair from generation: the resume fitted to the page budget, the cover letter to one page (SPEC §9.4). */
export async function fitDocuments<D extends Doc>(
  docs: { resume: D; coverLetter: D },
  { budget, keywords, compile, signal }: { budget: 1 | 2; keywords: string[]; compile: (kind: Doc["kind"], doc: Doc) => Promise<number>; signal?: AbortSignal }
): Promise<{ resume: D; coverLetter: D }> {
  const resume = await fitPages(docs.resume, { budget, keywords, compile: (d) => compile("resume", d), signal });
  const letter = await fitPages(docs.coverLetter, { budget: 1, keywords, compile: (d) => compile("coverLetter", d), signal });
  return { resume: { ...docs.resume, ...resume.doc }, coverLetter: { ...docs.coverLetter, ...letter.doc } };
}
