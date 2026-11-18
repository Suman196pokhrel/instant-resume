import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, type LanguageModel } from "ai";
import type { z } from "zod";
import { getActiveModel, listConnections, readKey } from "@/lib/keystore";
import { noModelError, toLlmError } from "./errors";
import { createMockAdapter, MOCK_FIXTURES, mockScenario } from "./mock";
import type { ProviderId } from "./providers";
import { resolveChoice } from "./use-choice";

// SPEC §8.1: one adapter hides the providers; every LLM call in the app goes through it, and tests swap in the mock.

/** maxOutputTokens: for long answers; the Anthropic SDK defaults to 4096 for model IDs it doesn't know. */
export type GenerateArgs<T> = { name: string; schema: z.ZodType<T>; system: string; prompt: string; maxOutputTokens?: number; signal?: AbortSignal };
export type Usage = { inputTokens: number; outputTokens: number };
export interface LlmAdapter {
  generateObject<T>(args: GenerateArgs<T>): Promise<{ object: T; usage: Usage }>;
}

/** The provider's model, called straight from this browser with the user's key. `fetch` is for tests. */
export function languageModel(id: ProviderId, apiKey: string, model: string, fetch?: typeof globalThis.fetch): LanguageModel {
  switch (id) {
    case "anthropic":
      return createAnthropic({ apiKey, fetch, headers: { "anthropic-dangerous-direct-browser-access": "true" } })(model);
    case "openai":
      return createOpenAI({ apiKey, fetch })(model);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey, fetch })(model);
  }
}

/** Validates output with the call's Zod schema (the SDK does, via Output.object), retrying once on bad output. */
export function createAdapter(model: LanguageModel, ctx: { provider: ProviderId; model: string }): LlmAdapter {
  return {
    async generateObject({ name, schema, system, prompt, maxOutputTokens, signal }) {
      for (let attempt = 0; ; attempt++) {
        try {
          const result = await generateText({ model, system, prompt, maxOutputTokens, abortSignal: signal, output: Output.object({ schema, name }) });
          return { object: result.output as z.infer<typeof schema>, usage: { inputTokens: result.usage.inputTokens ?? 0, outputTokens: result.usage.outputTokens ?? 0 } };
        } catch (e) {
          if (signal?.aborted) throw e; // a cancel, not a failure
          const error = toLlmError(e, ctx);
          if (error.kind !== "output" || attempt > 0) throw error;
        }
      }
    },
  };
}

/** The adapter for the active model: the mock when NEXT_PUBLIC_LLM_MOCK=1 (tests, demos), else the real provider. */
export async function getAdapter(): Promise<LlmAdapter> {
  if (process.env.NEXT_PUBLIC_LLM_MOCK === "1") return createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: mockScenario(), delayMs: 2000 }); // realistic (SPEC §8.1), and long enough to cancel
  const active = resolveChoice(getActiveModel(), await listConnections().catch(() => []));
  const key = active && (await readKey(active.provider).catch(() => null));
  if (!active || !key) throw noModelError();
  return createAdapter(languageModel(active.provider, key, active.model), active);
}
