import { describe, expect, it } from "vitest";
import { fitPages, type FitStep } from "@/lib/generate/fit";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";

// SPEC §9.4 page fitting: a deterministic loop of at most 8 compiles against a fake compiler (TASK-25).
type Doc = Omit<ResumeDocument, "id" | "projectId">;
const bullets = (n: number, role: string) => Array.from({ length: n }, (_, i) => ({ id: `${role}-b${i}`, text: i === 0 ? "Built React apps" : `Did task ${i}`, source: "hl" }));
const doc = (): Doc => ({
  kind: "resume",
  theme: { ...THEME_DEFAULTS },
  sections: [
    { id: "s-sum", kind: "summary", title: "Summary", hidden: false, text: "First sentence. Second sentence. Third sentence." },
    { id: "s-exp", kind: "experience", title: "Experience", hidden: false, items: [{ id: "i-new", ref: "r1", heading: "New", bullets: bullets(4, "new") }, { id: "i-old", ref: "r2", heading: "Old", bullets: bullets(3, "old") }] },
    { id: "s-pf", kind: "portfolio", title: "Portfolio", hidden: false, items: [] },
    { id: "s-cr", kind: "credentials", title: "Certifications and awards", hidden: false, items: [] },
    { id: "s-ref", kind: "referees", title: "Referees", hidden: false, items: [] },
  ] as Section[],
});

/** A fake compiler: a load score from the theme and content, over a fixed page height. */
const fake = (perPage: number) => async (d: Doc) => {
  const t = d.theme;
  const visible = d.sections.filter((s) => !s.hidden);
  const lines = visible.reduce((n, s) => n + ("text" in s ? s.text.split(". ").length : 2 + s.items.reduce((m, i) => m + (i.bullets?.length ?? 0), 0)), 0);
  const load = lines * t.lineHeight * t.baseSize + visible.length * t.sectionGap + t.margin * 4;
  return Math.ceil(load / perPage);
};
const run = async (budget: 1 | 2, perPage: number, keywords = ["React"]) => {
  const steps: FitStep[] = [];
  let compiles = 0;
  const compile = fake(perPage);
  const out = await fitPages(doc(), { budget, keywords, compile: (d) => (compiles++, compile(d)), onStep: (s) => steps.push(s) });
  return { ...out, steps, compiles };
};

describe("fitPages", () => {
  it("stops as soon as it fits: one line-spacing step for a document just over", async () => {
    const start = await fake(1)(doc());
    const r = await run(2, start / 2 - 1); // just over two pages at the defaults
    expect(r.fits).toBe(true);
    expect(r.steps.map((s) => s.action)).toEqual(["Laid out at the template defaults", "Tightening line spacing", "Fits on 2 pages"]);
    expect(r.doc.theme.lineHeight).toBeCloseTo(THEME_DEFAULTS.lineHeight - 0.05);
    expect(r.compiles).toBe(2);
  });

  it("goes through the adjustments in order, never past the floors, within 8 compiles", async () => {
    const r = await run(2, 40);
    expect(r.compiles).toBeLessThanOrEqual(8);
    expect(r.steps.slice(1, 7).map((s) => s.action)).toEqual(["Tightening line spacing", "Reducing space between sections", "Narrowing the margins", "Reducing the text size", "Dropping the least relevant bullet", "Shortening the summary"]);
    expect(r.doc.theme.lineHeight).toBeGreaterThanOrEqual(1.15);
    expect(r.doc.theme.margin).toBeGreaterThanOrEqual(12);
    expect(r.doc.theme.sectionGap).toBeGreaterThanOrEqual(6);
    expect(r.doc.theme.baseSize).toBeGreaterThanOrEqual(9.5);
  });

  it("drops the least relevant bullet from the oldest role and keeps 2 per role", async () => {
    const r = await run(2, 40);
    const exp = r.doc.sections.find((s) => s.kind === "experience") as Extract<Section, { items: unknown }>;
    expect(exp.items.map((i) => i.bullets!.map((b) => b.id))).toEqual([["new-b0", "new-b1", "new-b2", "new-b3"], ["old-b0", "old-b1"]]); // "Did task 2" of the old role: no keyword, oldest, last
    const summary = r.doc.sections[0] as { text: string };
    expect(summary.text).toBe("First sentence. Second sentence.");
  });

  it("with a one-page budget, the last step hides Portfolio, Certifications and Referees; never with two", async () => {
    const one = await run(1, 40);
    expect(one.steps.map((s) => s.action)).toContain("Hiding Portfolio, Certifications and Referees");
    expect(one.doc.sections.filter((s) => s.hidden).map((s) => s.kind)).toEqual(["portfolio", "credentials", "referees"]);
    const two = await run(2, 40);
    expect(two.doc.sections.some((s) => s.hidden)).toBe(false);
  });

  it("reports when it can't fit, with a step for each compile", async () => {
    const r = await run(2, 10);
    expect(r.fits).toBe(false);
    expect(r.pages).toBeGreaterThan(2);
    expect(r.steps).toHaveLength(r.compiles);
    expect(r.steps.every((s) => !s.done)).toBe(true);
    expect(r.steps.map((s) => s.value)).toEqual([...r.steps.map((s) => s.value)].sort((a, b) => b - a)); // pages never go up
  });
});
