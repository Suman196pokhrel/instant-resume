import type { GenerateArgs, LlmAdapter } from "./adapter";
import { LlmError, outputError } from "./errors";

// SPEC §8.1 MockLlmAdapter and §17 scenarios. Deterministic and offline: every automated test runs on it
// (NEXT_PUBLIC_LLM_MOCK=1). Each call's fixture arrives with that call (brief, match, generate, rewrite).

export const SCENARIOS = ["happy", "gaps", "findings", "error-stage-1", "error-stage-2", "error-stage-3", "error-stage-4", "error-stage-5"] as const;
export type Scenario = (typeof SCENARIOS)[number];
export type Fixture = (args: GenerateArgs<unknown>, scenario: Scenario) => unknown;

export const MOCK_FIXTURES: Record<string, Fixture> = {
  ping: (_args, scenario) => ({ ok: true, scenario }),
};

/** The scenario from `?mock=` (SPEC §17), or "happy". */
export function mockScenario(search = typeof location === "undefined" ? "" : location.search): Scenario {
  const s = new URLSearchParams(search).get("mock");
  return SCENARIOS.find((x) => x === s) ?? "happy";
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
    if (signal?.aborted) return abort();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), abort()), { once: true });
  });

export function createMockAdapter({ fixtures, scenario, delayMs = 0 }: { fixtures: Record<string, Fixture>; scenario: Scenario; delayMs?: number }): LlmAdapter {
  return {
    async generateObject(args) {
      await wait(delayMs, args.signal);
      const fixture = fixtures[args.name];
      if (!fixture) throw new LlmError("other", "Something went wrong with the mock provider", "Try again in a moment.", `no mock fixture for ${args.name}`);
      const parsed = args.schema.safeParse(fixture(args, scenario));
      if (!parsed.success) throw outputError();
      return { object: parsed.data, usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };
}
