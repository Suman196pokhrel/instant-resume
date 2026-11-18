import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { extractBrief } from "@/lib/brief/extract";
import { createAdapter, languageModel, type LlmAdapter, type Usage } from "@/lib/llm/adapter";
import { matchEvidence } from "@/lib/match/evidence";
import { kbSchema } from "@/lib/schemas/kb";

// Opt-in live check of the match call on Anthropic (SPEC §8.3 call 2; TASK-50 AC4):
//   set -a; . ./.env.keys; set +a; IR_LIVE=1 pnpm vitest run tests/unit/match-live.test.ts
const key = process.env.IR_LIVE === "1" ? process.env.ANTHROPIC_API_KEY : undefined;
const model = process.env.IR_LIVE_MODEL ?? "claude-sonnet-5-5";

it.skipIf(!key)(`matches Mintleaf's must-haves to the seed KB on ${model}`, async () => {
  const real = createAdapter(languageModel("anthropic", key!, model), { provider: "anthropic", model });
  const calls: { name: string; usage: Usage; ms: number }[] = [];
  const adapter: LlmAdapter = {
    async generateObject(args) {
      const t = performance.now();
      const r = await real.generateObject(args);
      calls.push({ name: args.name, usage: r.usage, ms: Math.round(performance.now() - t) });
      return r;
    },
  };
  const kb = kbSchema.parse(fixture);
  const brief = await extractBrief(readFileSync("tests/fixtures/jds/mintleaf.txt", "utf8"), adapter);
  const out = await matchEvidence(brief, kb, adapter);
  console.log(JSON.stringify({ model, calls, requirements: out.requirements, gaps: out.gaps, selected: out.selected }, null, 1));
  expect(out.requirements).toHaveLength(brief.requirements.length);
  expect(out.requirements.filter((r) => r.evidence.length).length).toBeGreaterThan(brief.requirements.length / 2); // the seed KB backs most of Mintleaf
  expect(out.selected).toEqual(expect.arrayContaining(["role-brightwater", "ed-unsw"]));
}, 120_000);
