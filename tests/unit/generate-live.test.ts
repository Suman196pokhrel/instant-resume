import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { extractBrief } from "@/lib/brief/extract";
import { generateDocuments } from "@/lib/generate/generate";
import { createAdapter, languageModel, type LlmAdapter, type Usage } from "@/lib/llm/adapter";
import { kbSchema } from "@/lib/schemas/kb";

// Opt-in live check of the generate call on Anthropic (SPEC §8.3; TASK-43 AC4). Skipped without a key:
//   set -a; . ./.env.keys; set +a; pnpm vitest run tests/unit/generate-live.test.ts
const key = process.env.ANTHROPIC_API_KEY;
const model = process.env.IR_LIVE_MODEL ?? "claude-sonnet-5-5";

it.skipIf(!key)(`generates validated documents for Mintleaf on ${model}`, async () => {
  const real = createAdapter(languageModel("anthropic", key!, model), { provider: "anthropic", model });
  const calls: { name: string; usage: Usage; ms: number }[] = [];
  const adapter: LlmAdapter = {
    async generateObject(args) {
      const t = performance.now();
      const r = await real.generateObject(args).catch((e) => {
        console.log("FAILED", args.name, Math.round(performance.now() - t), e.kind, e.detail, e.cause ?? "");
        throw e;
      });
      calls.push({ name: args.name, usage: r.usage, ms: Math.round(performance.now() - t) });
      if (process.env.IR_LIVE_DUMP) (await import("node:fs")).writeFileSync(`${process.env.IR_LIVE_DUMP}/${args.name}-${calls.length}.json`, JSON.stringify({ prompt: args.prompt, object: r.object }, null, 1));
      return r;
    },
  };
  const kb = kbSchema.parse(fixture);
  const brief = await extractBrief(readFileSync("tests/fixtures/jds/mintleaf.txt", "utf8"), adapter);
  const selected = ["role-brightwater", "role-mosaic", "role-civic", "pf-tidewatch", "ed-unsw", "cr-aws", "ref-dana", "ref-sam"];
  const out = await generateDocuments({ kb, brief, selected, notes: "Referred by Dana Okafor", tone: "Professional", spelling: "en-AU" }, adapter).catch((e) => {
    console.log("GENERATE FAILED", e.detail, JSON.stringify(calls));
    throw e;
  });
  console.log(JSON.stringify({ model, calls, count: out.count }, null, 1));
  console.log(JSON.stringify({ resume: out.resume.sections, coverLetter: out.coverLetter.sections.map((s) => "text" in s && s.text) }, null, 1));
  expect(out.count).toBeGreaterThan(8);
}, 180_000);
