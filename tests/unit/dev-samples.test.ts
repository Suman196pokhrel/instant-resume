import { afterEach, expect, it, vi } from "vitest";
import { sampleJds } from "@/lib/dev-samples";

// TASK-52: synthetic sample ads for Quick generate and Studio, development only (SPEC §14.3, §14.4).
afterEach(() => vi.unstubAllEnvs());

it("lists the synthetic ads with 'Company, Title' labels", async () => {
  const list = await sampleJds();
  expect(list!.map((s) => s.label)).toEqual([
    "Harbourline, Senior Frontend Engineer",
    "Lumen Rail, Senior Full Stack Engineer",
    "Mintleaf, Senior Full Stack Engineer",
    "Southerly Energy, Software Engineer, Platform", // the ad's own title line
    "Tessellate Health, Full Stack Engineer",
  ]);
  expect(list![2].text).toMatch(/^Senior Full Stack Engineer\nMintleaf/);
});

it("never reaches a production page", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(await sampleJds()).toBeNull();
});
