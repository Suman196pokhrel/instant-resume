import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { getActiveModel, listConnections, readKey } from "@/lib/keystore";
import { noModelError, outputError, toLlmError } from "./errors";
import { createMockAdapter, MOCK_FIXTURES, mockScenario } from "./mock";
import type { ProviderId } from "./providers";
import { resolveChoice } from "./use-choice";

// SPEC §8.1: one adapter hides the providers; every LLM call in the app goes through it, and tests swap in the mock.

/**
 * maxOutputTokens: for long answers; the Anthropic SDK defaults to 4096 for model IDs it doesn't know.
 * jsonInPrompt: for schemas too large for strict structured output (Anthropic compiles the schema into a grammar
 * with a size limit, and Sonnet and Opus 5.5 refuse the forced-tool alternative). The schema goes in the system
 * prompt and the answer is validated here with the same Zod schema, so nothing unvalidated gets through.
 * cachePrefix: the start of the prompt that repeats across calls (the knowledge base). It goes as its own block
 * marked for Anthropic's prompt cache, so a repeat within 5 minutes reads it at a tenth of the price; other providers
 * ignore the mark (OpenAI and Gemini cache repeated prefixes on their own). The prompt itself is unchanged.
 */
export type GenerateArgs<T> = { name: string; schema: z.ZodType<T>; system: string; prompt: string; cachePrefix?: string; maxOutputTokens?: number; jsonInPrompt?: boolean; signal?: AbortSignal };

/** The outermost JSON object in a model's text (code fences and surrounding prose are ignored), validated. */
function fromText<T>(text: string, schema: z.ZodType<T>): T {
  try {
    const parsed = schema.safeParse(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)));
    if (parsed.success) return parsed.data;
  } catch {
    // not JSON: an output error below
  }
  throw outputError();
}
export type Usage = { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number };
const CACHE = { anthropic: { cacheControl: { type: "ephemeral" as const } } };

/** The prompt as one user message, split after its cache prefix (which carries the cache mark). */
export function promptParts(prompt: string, prefix = "") {
  if (!prefix || !prompt.startsWith(prefix)) return { prompt };
  const rest = prompt.slice(prefix.length);
  return { messages: [{ role: "user" as const, content: [{ type: "text" as const, text: prefix, providerOptions: CACHE }, ...(rest ? [{ type: "text" as const, text: rest }] : [])] }] };
}
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
    async generateObject({ name, schema, system, prompt, cachePrefix, maxOutputTokens, jsonInPrompt, signal }) {
      for (let attempt = 0; ; attempt++) {
        try {
          const call = { model, ...promptParts(prompt, cachePrefix), maxOutputTokens, abortSignal: signal };
          const result = jsonInPrompt
            ? await generateText({ ...call, system: `${system}\n\nReturn only a JSON object that matches this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema, { io: "input" }))}` })
            : await generateText({ ...call, system, output: Output.object({ schema, name }) });
          const object = jsonInPrompt ? fromText(result.text, schema) : (result.output as z.infer<typeof schema>);
          const { inputTokens = 0, outputTokens = 0, inputTokenDetails: d } = result.usage;
          return { object, usage: { inputTokens, outputTokens, cacheReadTokens: d?.cacheReadTokens ?? 0, cacheWriteTokens: d?.cacheWriteTokens ?? 0 } };
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
