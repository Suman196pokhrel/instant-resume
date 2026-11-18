import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { extractBrief } from "@/lib/brief/extract";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { createMockAdapter, MOCK_FIXTURES } from "@/lib/llm/mock";
import { matchEvidence } from "@/lib/match/evidence";
import { kbSchema } from "@/lib/schemas/kb";

// SPEC §8.3 call 2: the match call picks the entries and finds the gaps (Quick generate only).
const kb = kbSchema.parse(structuredClone(fixture));
const ad = readFileSync("tests/fixtures/jds/mintleaf.txt", "utf8");
const mock = (scenario: "happy" | "gaps" = "happy") => createMockAdapter({ fixtures: MOCK_FIXTURES, scenario });
const fake = (object: unknown): LlmAdapter => ({ generateObject: async () => ({ object, usage: { inputTokens: 0, outputTokens: 0 } }) as never });

describe("matchEvidence", () => {
  it("drops unknown IDs, treats an omitted must-have as a gap, and selects the baseline, suggestions and evidence owners", async () => {
    const brief = await extractBrief(ad, mock());
    const [first, second] = brief.requirements;
    const out = await matchEvidence(brief, kb, fake({ requirements: [{ requirement: first.toUpperCase(), evidence: ["hl-tw-1", "hl-nope"] }, { requirement: second, evidence: ["nope"] }], suggestedEntryIds: ["pf-ledgerline", "pf-ghost"] }));
    expect(out.requirements[0]).toEqual({ requirement: first, evidence: ["hl-tw-1"] });
    expect(out.gaps).toEqual(brief.requirements.slice(1)); // second's only ID was unknown; the rest were left out
    expect(out.selected).toEqual(expect.arrayContaining(["role-brightwater", "role-mosaic", "role-civic", "ed-unsw", "ref-dana", "pf-ledgerline", "pf-tidewatch"]));
    expect(out.selected).not.toContain("pf-ghost");
    expect(new Set(out.selected).size).toBe(out.selected.length);
  });

  it("the mock finds evidence for every must-have on the happy path", async () => {
    const brief = await extractBrief(ad, mock());
    const out = await matchEvidence(brief, kb, mock());
    expect(out.gaps).toEqual([]);
    expect(out.requirements.every((r) => r.evidence.length)).toBe(true);
  });

  it("the mock's gaps scenario gives 2 gaps on the seed KB, and 1 once a Kubernetes highlight exists", async () => {
    const brief = await extractBrief(ad, mock("gaps"));
    expect((await matchEvidence(brief, kb, mock("gaps"))).gaps).toEqual(["Payments or financial services experience", "Kubernetes in production"]);
    const more = structuredClone(kb);
    more.roles[0].highlights.push({ id: "hl-k8s", text: "Ran the pricing service on Kubernetes", skills: ["Kubernetes"] });
    expect((await matchEvidence(brief, more, mock("gaps"))).gaps).toEqual(["Payments or financial services experience"]);
  });
});
