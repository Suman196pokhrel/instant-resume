import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/kb.json";
import { extractBrief } from "@/lib/brief/extract";
import { generateDocuments, type GenerateInput } from "@/lib/generate/generate";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { createMockAdapter, MOCK_FIXTURES } from "@/lib/llm/mock";
import { kbSchema } from "@/lib/schemas/kb";

// SPEC §8.3 call 3: one call fills both skeletons; every op passes the patch validator (TASK-13).
const kb = kbSchema.parse(structuredClone(fixture));
const mock = (scenario: "happy" = "happy") => createMockAdapter({ fixtures: MOCK_FIXTURES, scenario });
const input = async (over: Partial<GenerateInput> = {}): Promise<GenerateInput> => ({
  kb,
  brief: await extractBrief(readFileSync("tests/fixtures/jds/mintleaf.txt", "utf8"), mock()),
  selected: ["role-brightwater", "role-mosaic", "pf-tidewatch", "ed-unsw", "cr-aws", "ref-dana"],
  notes: "Referred by Priya Shah",
  tone: "Professional",
  spelling: "en-AU",
  ...over,
});
const bullets = (d: { sections: { kind: string; items?: { ref: string; bullets?: { source: string }[] }[] }[] }) =>
  d.sections.flatMap((s) => s.items?.flatMap((i) => (i.bullets ?? []).map((b) => [i.ref, b.source])) ?? []);

describe("generate", () => {
  it("the mock fills every summary, paragraph and bullet list, and all of it validates", async () => {
    const { resume, coverLetter, count } = await generateDocuments(await input(), mock());
    expect(resume.sections[0].kind === "summary" && resume.sections[0].text).toMatch(/Mintleaf/);
    expect(coverLetter.sections.every((s) => s.kind === "paragraph" && s.text.length > 0)).toBe(true);
    const refs = new Set(bullets(resume).map(([ref]) => ref));
    expect(refs).toEqual(new Set(["role-brightwater", "role-mosaic", "pf-tidewatch"]));
    expect(bullets(resume).every(([ref, src]) => kb.roles.concat().some((r) => r.id === ref && r.highlights.some((h) => h.id === src)) || kb.portfolio.some((p) => p.id === ref && p.highlights.some((h) => h.id === src)))).toBe(true);
    expect(count).toBeGreaterThan(8);
  });

  it("works for any knowledge base the mock is given (the shared e2e KB changes)", async () => {
    const other = structuredClone(kb);
    other.roles[0].highlights = [{ id: "hl-new-1", text: "Shipped a new thing", skills: [] }];
    const { resume } = await generateDocuments(await input({ kb: other, selected: ["role-brightwater"] }), mock());
    expect(bullets(resume)).toEqual([["role-brightwater", "hl-new-1"]]);
  });

  it("sends the skeleton paths, the selected entries only, the notes, tone and spelling", async () => {
    const generateObject = vi.fn((args) => mock().generateObject(args)) as LlmAdapter["generateObject"];
    await generateDocuments(await input(), { generateObject });
    const { name, prompt, maxOutputTokens } = vi.mocked(generateObject).mock.calls[0][0];
    expect(name).toBe("generate");
    expect(maxOutputTokens).toBeGreaterThan(4096);
    expect(prompt).toContain("/sections/1/items/0/bullets/-");
    expect(prompt).toContain("hl-bw-1");
    expect(prompt).not.toContain("hl-cd-1"); // role-civic wasn't selected
    expect(prompt).toContain("<notes>\nReferred by Priya Shah\n</notes>");
    expect(prompt).toMatch(/Professional/);
    expect(prompt).toMatch(/Australian/);
  });

  it("layers the user's writing instructions, grouped by target, on top of the rules (TASK-53)", async () => {
    const generateObject = vi.fn((args) => mock().generateObject(args)) as LlmAdapter["generateObject"];
    await generateDocuments(await input(), { generateObject });
    expect(vi.mocked(generateObject).mock.calls[0][0].prompt).not.toContain("<user-instructions>");
    const instructions = [
      { id: "i1", target: "coverLetter" as const, text: "Under 250 words." },
      { id: "i2", target: "experience" as const, text: "Bullets under 20 words." },
    ];
    await generateDocuments(await input({ instructions }), { generateObject });
    const { system, prompt } = vi.mocked(generateObject).mock.calls[1][0];
    expect(prompt).toContain("<user-instructions>\n- Experience: Bullets under 20 words.\n- Cover letter: Under 250 words.\n</user-instructions>");
    expect(system).toMatch(/never override the rules above/);
  });

  it("drops a skills reorder that changes a skill, and keeps the rest of the answer", async () => {
    const real = mock();
    const generateObject = vi.fn(async (args: { prompt: string }) => {
      const r = (await real.generateObject(args as Parameters<LlmAdapter["generateObject"]>[0])) as { object: { resumeOps: { op: string; path: string; value: unknown }[] } };
      const [, path, line] = args.prompt.match(/(\/sections\/\d+\/items\/\d+\/line)  ("[^"]*")/)!;
      r.object.resumeOps.push({ op: "replace", path, value: JSON.parse(line).toLowerCase() }); // "TypeScript" -> "typescript": not the same skills
      return r;
    }) as unknown as LlmAdapter["generateObject"];
    const { resume } = await generateDocuments(await input(), { generateObject });
    expect(generateObject).toHaveBeenCalledTimes(1);
    const skills = resume.sections.find((s) => s.kind === "skills")!;
    expect("items" in skills && skills.items[0].line).not.toBe(("items" in skills && skills.items[0].line?.toLowerCase()) || ""); // the KB's own line stays
  });

  it("retries once when the patch is rejected, then gives up with an output error", async () => {
    const bad = { resumeOps: [{ op: "add", path: "/sections/1/items/0/bullets/-", value: { text: "Invented", source: "hl-nope" } }], coverLetterOps: [] };
    const generateObject = vi.fn().mockResolvedValue({ object: bad, usage: { inputTokens: 0, outputTokens: 0 } });
    await expect(generateDocuments(await input(), { generateObject })).rejects.toMatchObject({ kind: "output" });
    expect(generateObject).toHaveBeenCalledTimes(2);

    const good = await mock().generateObject({ name: "generate", schema: { safeParse: (o: unknown) => ({ success: true, data: o }) } as never, system: "", prompt: vi.mocked(generateObject).mock.calls[0][0].prompt });
    generateObject.mockReset().mockResolvedValueOnce({ object: bad, usage: {} }).mockResolvedValueOnce(good);
    await expect(generateDocuments(await input(), { generateObject })).resolves.toHaveProperty("count");
  });

  it("an answer that leaves the summary or a paragraph empty is retried, then an output error", async () => {
    const generateObject = vi.fn().mockResolvedValue({ object: { resumeOps: [], coverLetterOps: [] }, usage: {} });
    await expect(generateDocuments(await input(), { generateObject })).rejects.toMatchObject({ kind: "output" });
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it("never sends reference-only text, and tells the model the banned phrases", async () => {
    const withOriginal = structuredClone(kb);
    withOriginal.additional = [{ id: "add-orig", title: "Original resume", notes: "ORIGINAL TEXT", referenceOnly: true }];
    const generateObject = vi.fn((args) => mock().generateObject(args)) as LlmAdapter["generateObject"];
    await generateDocuments(await input({ kb: withOriginal, selected: ["role-brightwater", "add-orig"] }), { generateObject });
    const { prompt, system } = vi.mocked(generateObject).mock.calls[0][0];
    expect(prompt).not.toContain("ORIGINAL TEXT");
    expect(system).toContain("proven track record");
  });

  it("a cancel stays an abort", async () => {
    const controller = new AbortController();
    controller.abort();
    const slow = createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "happy", delayMs: 50 });
    await expect(generateDocuments(await input(), slow, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
