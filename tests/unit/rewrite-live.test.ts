import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { extractBrief } from "@/lib/brief/extract";
import { generateDocuments } from "@/lib/generate/generate";
import { rewriteSection, rewriteTokens, type RewriteInput } from "@/lib/generate/rewrite";
import { createAdapter, languageModel, type LlmAdapter, type Usage } from "@/lib/llm/adapter";
import { createMockAdapter, MOCK_FIXTURES } from "@/lib/llm/mock";
import { kbSchema } from "@/lib/schemas/kb";

// Opt-in live check of the rewrite call on Anthropic (SPEC §8.3 call 4; TASK-16). The brief and documents come from
// the mock, so only the two rewrites are real:
//   set -a; . ./.env.keys; set +a; IR_LIVE=1 pnpm vitest run tests/unit/rewrite-live.test.ts
const key = process.env.IR_LIVE === "1" ? process.env.ANTHROPIC_API_KEY : undefined;
const model = process.env.IR_LIVE_MODEL ?? "claude-sonnet-5-5";

it.skipIf(!key)(`rewrites a resume section and a cover letter paragraph on ${model}`, async () => {
  const real = createAdapter(languageModel("anthropic", key!, model), { provider: "anthropic", model });
  const calls: { name: string; usage: Usage; ms: number }[] = [];
  const adapter: LlmAdapter = {
    async generateObject(args) {
      const t = performance.now();
      const r = await real.generateObject(args).catch((e) => {
        console.log("FAILED", args.name, e.kind, e.detail, e.cause ?? "");
        throw e;
      });
      calls.push({ name: args.name, usage: r.usage, ms: Math.round(performance.now() - t) });
      return r;
    },
  };
  const mock = createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "happy" });
  const kb = kbSchema.parse(fixture);
  const brief = await extractBrief(readFileSync("tests/fixtures/jds/mintleaf.txt", "utf8"), mock);
  const { resume, coverLetter } = await generateDocuments({ kb, brief, selected: ["role-brightwater", "role-mosaic", "pf-tidewatch", "ref-dana"], tone: "Professional", spelling: "en-AU" }, mock);
  const base = { resume, kb, brief, tone: "Professional", spelling: "en-AU" } as const;
  const asks: RewriteInput[] = [
    { ...base, doc: resume, sectionId: resume.sections.find((s) => s.kind === "experience")!.id, instruction: "Emphasise Mentoring" },
    { ...base, doc: coverLetter, sectionId: coverLetter.sections[1].id, instruction: "More concise" },
  ];
  for (const ask of asks) {
    const r = await rewriteSection(ask, adapter);
    console.log(JSON.stringify({ instruction: ask.instruction, estimate: rewriteTokens(ask), call: calls.at(-1), ops: r?.ops, note: r?.note }, null, 1));
    expect(r).not.toBeNull();
  }
  expect(calls).toHaveLength(2); // each validated first time, no silent retry
}, 120_000);
