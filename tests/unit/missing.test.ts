import { describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/kb.json";
import { suggestMissing, toHighlight, type MissingInput } from "@/lib/generate/missing";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { createMockAdapter, MOCK_FIXTURES } from "@/lib/llm/mock";
import type { JobBrief } from "@/lib/schemas/brief";
import { kbSchema } from "@/lib/schemas/kb";

// SPEC §8.3 call 5, Add what's missing (TASK-64): the user's own words in, knowledge base highlights out, checked on the device.
const kb = kbSchema.parse(structuredClone(fixture));
const brief = { title: "AI Engineer", company: "Acme", location: "", seniority: "Mid-level", requirements: ["Infrastructure as Code, preferably Terraform", "Python"], niceToHave: [], keywords: ["Terraform", "Kubernetes", "Python", "GraphQL"], workRights: "Not stated" } as JobBrief;
const input = (over: Partial<MissingInput> = {}): MissingInput => ({ kb, brief, keywords: ["Terraform", "Kubernetes"], text: "I used Terraform and Kubernetes on Tidewatch.", spelling: "en-AU", ...over });
const returning = (object: unknown) => {
  const generateObject = vi.fn().mockResolvedValue({ object, usage: {} });
  return { generateObject } as unknown as LlmAdapter & { generateObject: ReturnType<typeof vi.fn> };
};

describe("add what's missing", () => {
  it("sends the user's words, the ticked keywords and the entries they could go on", async () => {
    const adapter = returning({ highlights: [], note: "" });
    await suggestMissing(input(), adapter);
    const { name, prompt } = adapter.generateObject.mock.calls[0][0];
    expect(name).toBe("missing");
    expect(prompt).toContain("I used Terraform and Kubernetes on Tidewatch.");
    expect(prompt).toContain('["Terraform","Kubernetes"]');
    expect(prompt).toContain("pf-tidewatch");
    expect(prompt).toContain("Senior Software Engineer, Brightwater Logistics");
    expect(prompt).not.toContain("GraphQL"); // only the ticked keywords
  });

  it("drops suggestions for unknown entries or with blank text, and keeps only listed keywords in their listed spelling", async () => {
    const adapter = returning({
      highlights: [
        { entryId: "pf-tidewatch", text: " Provisioned the stack with Terraform ", metric: "", keywords: ["terraform", "Docker"] },
        { entryId: "role-nowhere", text: "Ran Kubernetes", metric: "", keywords: ["Kubernetes"] },
        { entryId: "role-mosaic", text: "  ", metric: "", keywords: ["Kubernetes"] },
        { entryId: "role-brightwater", text: "Ran Kubernetes in production", metric: "3 clusters", keywords: ["Kubernetes"] },
      ],
      note: "",
    });
    const { suggestions, note } = await suggestMissing(input(), adapter);
    expect(suggestions).toEqual([
      { entryId: "pf-tidewatch", type: "portfolio", label: "Tidewatch", text: "Provisioned the stack with Terraform", metric: undefined, keywords: ["Terraform"] },
      { entryId: "role-brightwater", type: "roles", label: "Senior Software Engineer, Brightwater Logistics", text: "Ran Kubernetes in production", metric: "3 clusters", keywords: ["Kubernetes"] },
    ]);
    expect(note).toBe("");
  });

  it("tags a highlight with every brief keyword it names, and answers the requirement that names one", () => {
    const h = toHighlight({ entryId: "pf-tidewatch", type: "portfolio", label: "Tidewatch", text: "Wrote the Python API and its Terraform", keywords: ["Terraform"] }, brief);
    expect(h).toEqual({ text: "Wrote the Python API and its Terraform", metric: undefined, skills: ["Terraform", "Python"], evidenceFor: "Infrastructure as Code, preferably Terraform" });
    expect(toHighlight({ entryId: "x", type: "roles", label: "", text: "Ran clusters", keywords: ["Kubernetes"] }, brief).evidenceFor).toBe("Kubernetes"); // no requirement names it
  });

  it("the mock places each sentence on the entry it names, with the keywords it mentions", async () => {
    const adapter = createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "happy" });
    const { suggestions } = await suggestMissing(input({ text: "I used Terraform on Tidewatch. At Mosaic Learning I ran Kubernetes." }), adapter);
    expect(suggestions.map((s) => [s.entryId, s.keywords])).toEqual([
      ["pf-tidewatch", ["Terraform"]],
      ["role-mosaic", ["Kubernetes"]],
    ]);
  });
});
