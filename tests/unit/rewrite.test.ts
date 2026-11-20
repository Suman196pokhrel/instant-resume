import { describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/kb.json";
import { buildSkeleton } from "@/lib/generate/skeleton";
import { noChangeExample, rewriteSection, rewriteTokens, rewriteWarnings, type RewriteInput } from "@/lib/generate/rewrite";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { LlmError } from "@/lib/llm/errors";
import { createMockAdapter, MOCK_FIXTURES } from "@/lib/llm/mock";
import type { Op } from "@/lib/patch/validate";
import type { JobBrief } from "@/lib/schemas/brief";
import { kbSchema } from "@/lib/schemas/kb";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";

// SPEC §8.3 call 4: one section in, JSON Patch ops for that section out, validated before anything is shown (TASK-16).
const kb = kbSchema.parse(structuredClone(fixture));
const brief = { title: "Senior Full Stack Engineer", company: "Mintleaf", location: "Melbourne VIC", seniority: "Senior", requirements: ["Mentoring"], niceToHave: [], keywords: ["React", "Mentoring"], workRights: "Not stated" } as JobBrief;
// Summary 0, Experience 1 (brightwater 0, mosaic 1), Skills 2, Portfolio 3, Referees 4
const { resume, coverLetter } = buildSkeleton(kb, brief, ["role-brightwater", "role-mosaic", "pf-tidewatch", "ref-dana"], THEME_DEFAULTS);
if (resume.sections[0].kind === "summary") resume.sections[0].text = "Engineer with eight years in web apps. I build fast React front ends.";
const exp = resume.sections[1];
if (exp.kind === "experience") {
  exp.items[0].bullets = [0, 1, 2].map((j) => ({ id: `b-bw-${j}`, text: kb.roles[0].highlights[j].text, source: kb.roles[0].highlights[j].id }));
  exp.items[1].bullets = [{ id: "b-mo-0", text: kb.roles[1].highlights[0].text, source: kb.roles[1].highlights[0].id }];
}
coverLetter.sections.forEach((s) => s.kind === "paragraph" && (s.text = "I'm applying for the role. I have shipped React apps for years."));

const input = (over: Partial<RewriteInput> = {}): RewriteInput => ({ doc: resume, resume, sectionId: exp.id, instruction: "Emphasise Mentoring", kb, brief, tone: "Professional", spelling: "en-AU", ...over });
const mock = () => createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "happy" });
const returning = (...answers: Op[][]) => {
  const generateObject = vi.fn();
  answers.forEach((ops) => generateObject.mockResolvedValueOnce({ object: { ops, note: "" }, usage: {} }));
  return { generateObject } as unknown as LlmAdapter & { generateObject: ReturnType<typeof vi.fn> };
};

describe("rewrite", () => {
  it("sends the whole-resume and this section's instructions, never another section's or the letter's (TASK-53)", async () => {
    const instructions = (["resume", "experience", "summary", "coverLetter"] as const).map((target) => ({ id: target, target, text: `Rule for ${target}.` }));
    const adapter = returning([], []);
    await rewriteSection(input({ instructions }), adapter).catch(() => null);
    const prompt: string = adapter.generateObject.mock.calls[0][0].prompt;
    expect(prompt).toContain("- Whole resume: Rule for resume.\n- Experience: Rule for experience.");
    expect(prompt).not.toMatch(/Rule for (summary|coverLetter)/);
    const letter = coverLetter.sections[0];
    await rewriteSection(input({ doc: coverLetter, sectionId: letter.id, instructions }), adapter).catch(() => null);
    expect(adapter.generateObject.mock.calls[1][0].prompt).toMatch(/<user-instructions>\n- Cover letter: Rule for coverLetter.\n<\/user-instructions>/);
  });

  it("sends only the selected section, with its index, and the entries it references", async () => {
    const adapter = returning([{ op: "replace", path: "/sections/1/items/0/bullets/0/text", value: "Rebuilt the dashboard" }]);
    await rewriteSection(input(), adapter);
    const { name, prompt } = adapter.generateObject.mock.calls[0][0];
    expect(name).toBe("rewrite");
    expect(prompt).toContain("/sections/1/items/0/bullets/0/text");
    expect(prompt).toContain("Emphasise Mentoring");
    expect(prompt).not.toContain("/sections/0/");
    expect(prompt).not.toContain("eight years in web apps"); // the summary isn't sent
    expect(prompt).toContain("hl-bw-5"); // its entries' highlights are
    expect(prompt).not.toContain("hl-tw-1"); // a portfolio entry it doesn't reference isn't
  });

  it("returns the validated section and its ops", async () => {
    const r = await rewriteSection(input(), mock());
    if (!r) throw new Error("no change");
    const added = r.after.kind === "experience" ? r.after.items[0].bullets![0] : null;
    expect(added?.source).toBe("hl-bw-5");
    expect(r.ops.some((o) => o.op === "add")).toBe(true);
  });

  it("an op outside the section is rejected, retried once, then an output error", async () => {
    const bad: Op[] = [{ op: "replace", path: "/sections/0/text", value: "x" }];
    const adapter = returning(bad, bad);
    const err = await rewriteSection(input(), adapter).catch((e) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect((err as LlmError).kind).toBe("output");
    expect(adapter.generateObject).toHaveBeenCalledTimes(2);
  });

  it("an added bullet sourced from another entry's highlight is rejected", async () => {
    const foreign: Op[] = [{ op: "add", path: "/sections/1/items/0/bullets/0", value: { text: "Cut latency", source: "hl-mo-3" } }];
    const fixed: Op[] = [{ op: "add", path: "/sections/1/items/0/bullets/0", value: { text: "Mentored graduates", source: "hl-bw-5" } }];
    const adapter = returning(foreign, fixed);
    const r = await rewriteSection(input(), adapter);
    expect(adapter.generateObject).toHaveBeenCalledTimes(2);
    expect(r?.after.kind === "experience" && r.after.items[0].bullets![0].source).toBe("hl-bw-5");
  });

  it("no ops, or a replace with the same text, is no change", async () => {
    expect(await rewriteSection(input(), returning([]))).toBeNull();
    const same = exp.kind === "experience" ? exp.items[0].bullets![0].text : "";
    expect(await rewriteSection(input(), returning([{ op: "replace", path: "/sections/1/items/0/bullets/0/text", value: same }]))).toBeNull();
  });

  it("a summary or cover letter paragraph is grounded in the entries the resume uses", async () => {
    const adapter = returning([{ op: "replace", path: "/sections/0/text", value: "Shorter." }]);
    const r = await rewriteSection(input({ doc: coverLetter, sectionId: coverLetter.sections[0].id, instruction: "More concise" }), adapter);
    const { prompt } = adapter.generateObject.mock.calls[0][0];
    expect(prompt).toContain("hl-bw-5");
    expect(prompt).toContain("hl-tw-1");
    expect(r?.after.kind === "paragraph" && r.after.text).toBe("Shorter.");
  });

  it("the mock changes nothing for an instruction it doesn't know, and shortens for More concise", async () => {
    expect(await rewriteSection(input({ instruction: "make it sparkle" }), mock())).toBeNull();
    const r = await rewriteSection(input({ doc: coverLetter, sectionId: coverLetter.sections[0].id, instruction: "More concise" }), mock());
    expect(r?.after.kind === "paragraph" && r.after.text).toBe("I'm applying for the role.");
  });

  it("the token note counts the request actually sent", () => {
    const n = rewriteTokens(input());
    expect(n).toBeGreaterThan(300);
    expect(rewriteTokens(input({ instruction: "Emphasise Mentoring ".repeat(40) }))).toBeGreaterThan(n + 150);
  });
});

describe("no change and warnings", () => {
  it("suggests the first example that differs from the instruction just sent", () => {
    expect(noChangeExample("make it sparkle", brief)).toBe("emphasise React");
    expect(noChangeExample("Emphasise React", brief)).toBe("lead with metrics");
  });

  it("warns when an emphasised term isn't in the knowledge base", () => {
    expect(rewriteWarnings("Emphasise Kubernetes", kb)).toEqual(["Kubernetes isn't in your knowledge base. If you accept, checks will flag it as an unsupported claim."]);
    expect(rewriteWarnings("Emphasise Mentoring", kb)).toEqual([]);
    expect(rewriteWarnings("More concise", kb)).toEqual([]);
  });
});
