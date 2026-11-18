import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAdapter, languageModel } from "@/lib/llm/adapter";

// SPEC §8.1 adapter, §8.3: output is validated with Zod, retried once, and every failure is a readable LlmError.
const schema = z.object({ ok: z.boolean() });
const args = { name: "ping", schema, system: "Return JSON.", prompt: "Say ok." };
const ctx = { provider: "openai" as const, model: "gpt-6.2-sol" };

const reply = (text: string) => ({
  content: [{ type: "text" as const, text }],
  finishReason: { unified: "stop" as const, raw: undefined },
  usage: { inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 3, text: 3, reasoning: 0 } },
  warnings: [],
});

describe("createAdapter", () => {
  it("returns the validated object and token usage", async () => {
    const model = new MockLanguageModelV4({ doGenerate: reply('{"ok":true}') });
    expect(await createAdapter(model, ctx).generateObject(args)).toEqual({ object: { ok: true }, usage: { inputTokens: 12, outputTokens: 3 } });
  });

  it("passes a call's output budget to the provider", async () => {
    const model = new MockLanguageModelV4({ doGenerate: reply('{"ok":true}') });
    await createAdapter(model, ctx).generateObject({ ...args, maxOutputTokens: 16000 });
    expect(model.doGenerateCalls[0].maxOutputTokens).toBe(16000);
  });

  it("retries once when the output fails the schema, then succeeds", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [reply('{"ok":"yes"}'), reply('{"ok":false}')] });
    expect((await createAdapter(model, ctx).generateObject(args)).object).toEqual({ ok: false });
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("gives up after the retry with a readable error, never a raw SDK error", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [reply("not json"), reply('{"nope":1}'), reply('{"ok":true}')] });
    await expect(createAdapter(model, ctx).generateObject(args)).rejects.toMatchObject({ name: "LlmError", kind: "output", title: "The model's answer couldn't be used" });
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("maps a provider failure, such as a retired model, without retrying it as bad output", async () => {
    const gone = new APICallError({ message: "x", url: "u", requestBodyValues: {}, statusCode: 404, responseBody: '{"error":{"code":"model_not_found"}}' });
    const model = new MockLanguageModelV4({ doGenerate: () => Promise.reject(gone) });
    await expect(createAdapter(model, ctx).generateObject(args)).rejects.toMatchObject({ kind: "model", title: "gpt-6.2-sol isn't available any more" });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("lets a cancel through as an abort, not an error message", async () => {
    const controller = new AbortController();
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        controller.abort();
        throw new DOMException("The operation was aborted.", "AbortError");
      },
    });
    await expect(createAdapter(model, ctx).generateObject({ ...args, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("jsonInPrompt (schemas too large for strict structured output)", () => {
  const big = { ...args, jsonInPrompt: true };

  it("puts the schema in the system prompt, sends no structured-output request, and reads fenced or wrapped JSON", async () => {
    for (const text of ['```json\n{"ok":true}\n```', 'Here it is:\n{"ok":true}\nDone.']) {
      const model = new MockLanguageModelV4({ doGenerate: reply(text) });
      expect((await createAdapter(model, ctx).generateObject(big)).object).toEqual({ ok: true });
      const call = model.doGenerateCalls[0];
      expect(call.responseFormat?.type ?? "text").toBe("text");
      expect(JSON.stringify(call.prompt)).toContain('\\"ok\\"'); // the JSON Schema is in the system prompt
    }
  });

  it("retries once on unusable JSON, then gives the readable output error", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [reply("no json here"), reply('{"ok":"yes"}')] });
    await expect(createAdapter(model, ctx).generateObject(big)).rejects.toMatchObject({ kind: "output" });
    expect(model.doGenerateCalls).toHaveLength(2);
  });
});

describe("languageModel", () => {
  const ok = { anthropic: { content: [{ type: "text", text: '{"ok":true}' }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } } };

  it("calls Anthropic straight from the browser with the opt-in header and the chosen model", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", ...ok.anthropic })));
    await createAdapter(languageModel("anthropic", "sk-ant-KEY", "claude-opus-5-5", fetch), { provider: "anthropic", model: "claude-opus-5-5" })
      .generateObject(args)
      .catch(() => {});
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    expect(new Headers(init.headers).get("anthropic-dangerous-direct-browser-access")).toBe("true");
    expect(new Headers(init.headers).get("x-api-key")).toBe("sk-ant-KEY");
    expect(JSON.parse(init.body).model).toBe("claude-opus-5-5");
  });

  it("calls OpenAI and Gemini on their own hosts with the key in a header", async () => {
    for (const [p, key, model, host, header] of [
      ["openai", "sk-KEY", "gpt-6.2-sol", "https://api.openai.com/", "authorization"],
      ["gemini", "AIzaKEY", "gemini-3.8-flash", "https://generativelanguage.googleapis.com/", "x-goog-api-key"],
    ] as const) {
      const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 400 }));
      await createAdapter(languageModel(p, key, model, fetch), { provider: p, model })
        .generateObject(args)
        .catch(() => {});
      const [url, init] = fetch.mock.calls[0];
      expect(String(url).startsWith(host)).toBe(true);
      expect(String(url)).not.toContain(key);
      expect(new Headers(init.headers).get(header)).toContain(key);
    }
  });
});
