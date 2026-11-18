import { matchedKeywords } from "@/lib/match/keywords";
import type { ResumeDocument, Section } from "@/lib/schemas/document";

// Page fitting (SPEC §9.4): a deterministic loop of at most 8 compiles. After each compile that runs over the
// budget, the next adjustment that can still change the document is applied, in a fixed order and within floors.
// The three 1-page hides are one step, so the whole list fits in 8 compiles.

type Doc = Omit<ResumeDocument, "id" | "projectId">;
export type FitStep = { value: number; action: string; done: boolean };
type Opts = { budget: 1 | 2; keywords: string[]; compile: (doc: Doc) => Promise<number>; onStep?: (s: FitStep) => void; signal?: AbortSignal };

export const MAX_COMPILES = 8;
const round = (n: number) => Math.round(n * 100) / 100;

/** Lowers one theme value by a step, never below its floor; null when it's already there. */
const lower = (key: "lineHeight" | "sectionGap" | "margin" | "baseSize", by: number, floor: number) => (d: Doc) =>
  d.theme[key] <= floor ? null : { ...d, theme: { ...d.theme, [key]: round(Math.max(floor, d.theme[key] - by)) } };

/** Drops the least relevant bullet: fewest keyword matches, oldest role first (the last item), keeping 2 per role. */
function dropBullet(keywords: string[]) {
  return (d: Doc) => {
    let best: { s: number; i: number; b: number; score: number } | null = null;
    d.sections.forEach((s, si) => {
      if (s.hidden || s.kind !== "experience" || !("items" in s)) return;
      s.items.forEach((it, ii) => {
        const bs = it.bullets ?? [];
        if (bs.length <= 2) return;
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

function shortenSummary(d: Doc) {
  const i = d.sections.findIndex((s) => s.kind === "summary" && !s.hidden);
  const s = d.sections[i];
  if (i < 0 || !("text" in s)) return null;
  const sentences = s.text.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((x) => x.trim()) ?? [];
  if (sentences.length < 2) return null;
  return { ...d, sections: d.sections.map((x, k) => (k === i ? { ...s, text: sentences.slice(0, -1).join(" ") } : x)) };
}

const HIDE_ON_ONE_PAGE = new Set(["portfolio", "credentials", "referees"]);
function hideExtras(d: Doc) {
  if (!d.sections.some((s) => HIDE_ON_ONE_PAGE.has(s.kind) && !s.hidden)) return null;
  return { ...d, sections: d.sections.map((s) => (HIDE_ON_ONE_PAGE.has(s.kind) ? { ...s, hidden: true } : s)) };
}

export async function fitPages(start: Doc, { budget, keywords, compile, onStep, signal }: Opts): Promise<{ doc: Doc; pages: number; fits: boolean }> {
  const steps: [string, (d: Doc) => Doc | null][] = [
    ["Tightening line spacing", lower("lineHeight", 0.05, 1.15)],
    ["Reducing space between sections", lower("sectionGap", 2, 6)],
    ["Narrowing the margins", lower("margin", 2, 12)],
    ["Reducing the text size", lower("baseSize", 0.5, 9.5)],
    ["Dropping the least relevant bullet", dropBullet(keywords)],
    ["Shortening the summary", shortenSummary],
    ...(budget === 1 ? ([["Hiding Portfolio, Certifications and Referees", hideExtras]] as [string, (d: Doc) => Doc | null][]) : []),
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
    while (!changed && next < steps.length && compiles < MAX_COMPILES) [action, changed] = [steps[next][0], steps[next++][1](doc)];
    if (!changed) return { doc, pages, fits: false };
    doc = changed;
  }
}
