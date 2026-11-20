import { describe, expect, it } from "vitest";
import { fitPages, MAX_COMPILES, type FitStep } from "@/lib/generate/fit";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";

// SPEC §9.4 page fitting: a deterministic loop of at most 16 compiles against a fake compiler (TASK-25; 1-page target).
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

  it("goes through the adjustments in order, repeating the content steps, never past the floors, within 16 compiles", async () => {
    const r = await run(2, 40);
    expect(r.compiles).toBeLessThanOrEqual(MAX_COMPILES);
    const actions = r.steps.slice(1).map((s) => s.action);
    expect([...new Set(actions)]).toEqual(["Tightening line spacing", "Reducing space between sections", "Narrowing the margins", "Reducing the text size", "Dropping the least relevant bullet", "Shortening the summary"]);
    expect(actions.filter((a) => a === "Dropping the least relevant bullet")).toHaveLength(3); // one per compile until each role has 2
    expect(r.doc.theme.lineHeight).toBeGreaterThanOrEqual(1.15);
    expect(r.doc.theme.margin).toBeGreaterThanOrEqual(12);
    expect(r.doc.theme.sectionGap).toBeGreaterThanOrEqual(6);
    expect(r.doc.theme.baseSize).toBeGreaterThanOrEqual(9.5);
  });

  it("drops the least relevant bullets, oldest role first, down to 2 per role, then shortens the summary to two sentences (TASK-56)", async () => {
    const steps: string[] = [];
    const r = await fitPages(doc(), { budget: 2, keywords: ["React"], compile: fake(40), onStep: (s) => steps.push(s.action) });
    const exp = r.doc.sections.find((s) => s.kind === "experience") as Extract<Section, { items: unknown }>;
    expect(exp.items.map((i) => i.bullets!.map((b) => b.id))).toEqual([["new-b0", "new-b1"], ["old-b0", "old-b1"]]); // the old role's "Did task 2" went first
    const summary = r.doc.sections[0] as { text: string };
    expect(summary.text).toBe("First sentence. Second sentence.");
  });

  it("keeps the sentences it keeps exactly as written: a decimal is never cut (TASK-59)", async () => {
    const d = doc();
    (d.sections[0] as { text: string }).text = "Has 1.5 years at Harbour Health, cutting load from 4.2s to 1.1s. Earlier handled 15 enquiries a day. Third sentence";
    const r = await fitPages(d, { budget: 2, keywords: ["React"], compile: fake(40) });
    expect((r.doc.sections[0] as { text: string }).text).toBe("Has 1.5 years at Harbour Health, cutting load from 4.2s to 1.1s. Earlier handled 15 enquiries a day.");
  });

  it("on a 1-page budget, a one-sentence summary is the very last resort, after one bullet per role (TASK-56)", async () => {
    const steps: string[] = [];
    const r = await fitPages(doc(), { budget: 1, keywords: ["React"], compile: fake(18), onStep: (s) => steps.push(s.action) });
    const order = [...new Set(steps)];
    expect(order.indexOf("Keeping one bullet per role")).toBeLessThan(order.indexOf("Shortening the summary to one sentence"));
    expect((r.doc.sections[0] as { text: string }).text).toBe("First sentence.");
  });

  it("a cover letter loses sentences from its longest paragraph, keeping one in each", async () => {
    const letter: Doc = {
      kind: "coverLetter",
      theme: { ...THEME_DEFAULTS },
      sections: [
        { id: "p0", kind: "paragraph", title: "Opening", hidden: false, text: "One. Two." },
        { id: "p1", kind: "paragraph", title: "Evidence", hidden: false, text: "A long first sentence here. A second one. A third one." },
      ] as Section[],
    };
    const r = await fitPages(letter, { budget: 1, keywords: [], compile: async (d) => (d.sections.map((s) => ("text" in s ? s.text : "")).join(" ").length > 35 ? 2 : 1) });
    expect(r.fits).toBe(true);
    expect(r.doc.sections.map((s) => ("text" in s ? s.text : ""))).toEqual(["One.", "A long first sentence here."]);
  });

  it("with a one-page budget, Portfolio, Certifications and Referees go before any content, and Additional sections last; never with two", async () => {
    const one = await run(1, 40);
    const actions = one.steps.map((s) => s.action);
    expect(actions.indexOf("Hiding Portfolio, Certifications and Referees")).toBeGreaterThan(0);
    expect(actions.indexOf("Hiding Portfolio, Certifications and Referees")).toBeLessThan(actions.indexOf("Dropping the least relevant bullet"));
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

describe("fitPages: one-page last steps (real-resume bug: a long skills list kept it on 2 pages)", () => {
  const withSkills = (): Doc => {
    const d = doc();
    d.sections.push({ id: "s-sk", kind: "skills", title: "Skills", hidden: false, items: [
      { id: "g1", ref: "sk1", heading: "Software", line: "React, Cobol, Fortran" },
      { id: "g2", ref: "sk2", heading: "Personal", line: "Punctual, Reliable" },
    ] } as Section);
    return d;
  };
  const skills = (d: Doc) => (d.sections.find((s) => s.kind === "skills") as Extract<Section, { items: unknown }>).items.map((i) => `${i.heading}: ${i.line}`);

  it("keeps only the skills the job asks for, dropping a group with none", async () => {
    let n = 0;
    const r = await fitPages(withSkills(), { budget: 1, keywords: ["React"], compile: async (d) => (skills(d).length > 1 || ++n < 6 ? 2 : 1) });
    expect(skills(r.doc)).toEqual(["Software: React"]);
  });

  it("never empties the Skills section, and as a last resort keeps one bullet per role", async () => {
    const r = await fitPages(withSkills(), { budget: 1, keywords: ["Kotlin"], compile: async () => 2 });
    expect(skills(r.doc)).toHaveLength(2); // nothing matched, so the skills stay
    const exp = r.doc.sections.find((s) => s.kind === "experience") as Extract<Section, { items: unknown }>;
    expect(exp.items.map((i) => i.bullets!.length)).toEqual([1, 1]);
  });
});
