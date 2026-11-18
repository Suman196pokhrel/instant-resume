import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { extractBrief, inAd } from "@/lib/brief/extract";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { createMockAdapter, MOCK_FIXTURES } from "@/lib/llm/mock";

// SPEC §8.3 call 1 and §17: the brief, with keywords grounded in the ad.
const MINTLEAF = readFileSync("tests/fixtures/jds/mintleaf.txt", "utf8");

it("keeps only keywords the ad uses, allowing a word's other forms", () => {
  expect(inAd(MINTLEAF, "Testing")).toBe(true); // the ad says "tests"
  expect(inAd(MINTLEAF, "Mentoring")).toBe(true);
  expect(inAd(MINTLEAF, "Kubernetes")).toBe(false);
});

it("sends the ad as the named brief call and drops invented or repeated keywords", async () => {
  const brief = { title: "Senior Full Stack Engineer", company: "Mintleaf", location: "Melbourne VIC", seniority: "Senior", requirements: ["React"], niceToHave: [], keywords: ["React", "Kubernetes", "React ", "Testing"], workRights: "Not stated" };
  const generateObject = vi.fn().mockResolvedValue({ object: brief, usage: { inputTokens: 1, outputTokens: 1 } });
  const out = await extractBrief(MINTLEAF, { generateObject } as LlmAdapter);
  expect(generateObject.mock.calls[0][0]).toMatchObject({ name: "brief", prompt: `<job-ad>\n${MINTLEAF}\n</job-ad>` });
  expect(out.keywords).toEqual(["React", "Testing"]);
});

it("the mock returns SPEC §17's Mintleaf brief, and brief-error fails the first call only", async () => {
  const ok = await extractBrief(MINTLEAF, createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "happy" }));
  expect(ok).toMatchObject({ title: "Senior Full Stack Engineer", company: "Mintleaf", location: "Melbourne VIC", seniority: "Senior" });
  expect(ok.requirements).toEqual(["5+ years building web apps", "React, TypeScript and Node.js", "Strong SQL and PostgreSQL", "AWS in production", "Mentoring and technical leadership"]);
  expect(ok.niceToHave).toEqual(["GraphQL", "Terraform", "Accessibility"]);
  expect(ok.keywords).toEqual(["React", "TypeScript", "Node.js", "PostgreSQL", "SQL", "AWS", "Performance", "Testing", "Mentoring", "GraphQL", "Terraform", "Accessibility"]);
  const failing = createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "brief-error" });
  await expect(extractBrief(MINTLEAF, failing)).rejects.toMatchObject({ kind: "busy" });
  expect((await extractBrief(MINTLEAF, failing)).company).toBe("Mintleaf");
});

it("the mock builds a plain brief for any other ad", async () => {
  const ad = "Platform Engineer\nSoutherly Energy, Sydney NSW\n\nAbout you\n- Go and Kubernetes in production\n- Terraform";
  const b = await extractBrief(ad, createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "happy" }));
  expect(b).toMatchObject({ title: "Platform Engineer", company: "Southerly Energy", location: "Sydney NSW", requirements: ["Go and Kubernetes in production", "Terraform"] });
  expect(b.keywords).toEqual(["Go", "Kubernetes", "Terraform"]);
});
