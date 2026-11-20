import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { LlmError, toLlmError } from "@/lib/llm/errors";
import type { ProviderId } from "@/lib/llm/providers";

// SPEC §8.3 Errors: every provider failure becomes a short, plain message with a next step. Bodies are the providers' real shapes.
const api = (statusCode: number, body: unknown) =>
  new APICallError({ message: "provider error", url: "https://example.test", requestBodyValues: {}, statusCode, responseBody: JSON.stringify(body) });
const as = (provider: ProviderId, e: unknown) => toLlmError(e, { provider, model: "some-model" });

describe("toLlmError", () => {
  it("a rejected or revoked key, from each provider, points to Settings", () => {
    for (const [p, e] of [
      ["anthropic", api(401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } })],
      ["openai", api(401, { error: { message: "Incorrect API key provided", type: "invalid_request_error", code: "invalid_api_key" } })],
      ["gemini", api(400, { error: { code: 400, status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } })],
      ["gemini", api(403, { error: { code: 403, status: "PERMISSION_DENIED", message: "API key not valid. Please pass a valid API key." } })],
    ] as const) {
      expect(as(p, e)).toMatchObject({ kind: "key", action: { label: "Open Settings", href: "/settings" } });
    }
    expect(as("anthropic", api(401, { type: "error", error: { type: "authentication_error" } }))).toMatchObject({
      title: "Anthropic didn't accept your API key",
      message: "The key may have been revoked, expired or deleted. Add a new key in Settings to keep going.",
      detail: "401 authentication_error",
    });
  });

  it("a 403 that isn't a bad key says the key works but can't do this; a region block says so (TASK-40)", () => {
    for (const [p, e] of [
      ["anthropic", api(403, { type: "error", error: { type: "permission_error", message: "Your API key does not have permission to use the specified resource." } })],
      ["gemini", api(403, { error: { code: 403, status: "PERMISSION_DENIED", message: "Permission denied" } })],
      ["openai", api(403, { error: { message: "You are not allowed to sample from this model", type: "invalid_request_error", code: null } })],
    ] as const)
      expect(as(p, e)).toMatchObject({ kind: "access", title: expect.stringMatching(/won't let this key do that$/), action: { label: "Choose a model", href: "/settings" } });
    expect(as("anthropic", api(403, { type: "error", error: { type: "permission_error", message: "x" } })).message).toBe(
      "Your key works, but its account can't use some-model for this, because of a permission, organisation or region limit. Choose another model, or check the key's access with Anthropic."
    );
    expect(as("openai", api(403, { error: { code: "unsupported_country_region_territory", message: "Country, region, or territory not supported" } }))).toMatchObject({
      kind: "access",
      title: "OpenAI isn't available in your region",
      message: "OpenAI doesn't accept requests from where you are. Switch to another provider in Settings.",
      action: { label: "Open Settings", href: "/settings" },
    });
  });

  it("a plain 400 never says 'try again in a moment': too long, or a request the provider couldn't accept (TASK-40)", () => {
    for (const [p, e] of [
      ["anthropic", api(400, { type: "error", error: { type: "invalid_request_error", message: "prompt is too long: 210000 tokens > 200000 maximum" } })],
      ["openai", api(400, { error: { message: "This model's maximum context length is 128000 tokens.", type: "invalid_request_error", code: "context_length_exceeded" } })],
      ["gemini", api(400, { error: { code: 400, status: "INVALID_ARGUMENT", message: "The input token count (1200000) exceeds the maximum number of tokens allowed (1048576)." } })],
    ] as const)
      expect(as(p, e)).toMatchObject({ kind: "request", title: "This is too long for some-model", message: "Your knowledge base and the job description together are more than this model accepts. Choose a model with more room, or shorten the job description." });
    expect(as("anthropic", api(400, { type: "error", error: { type: "invalid_request_error", message: "The compiled grammar is too large" } }))).toMatchObject({
      kind: "request",
      title: "Anthropic couldn't accept this request",
      message: "Nothing was changed. Try another model; if it keeps happening, it's a problem in Instant Resume.",
      detail: "400 invalid_request_error",
      action: { label: "Choose a model", href: "/settings" },
    });
  });

  it("a retired, renamed or unknown model names the model and asks for another", () => {
    for (const [p, e] of [
      ["anthropic", api(404, { type: "error", error: { type: "not_found_error", message: "model: claude-old" } })],
      ["openai", api(404, { error: { message: "The model `gpt-old` does not exist or you do not have access to it.", code: "model_not_found" } })],
      ["gemini", api(404, { error: { code: 404, status: "NOT_FOUND", message: "models/gemini-old is not found for API version v1beta" } })],
      ["openai", api(400, { error: { message: "The model gpt-old has been deprecated", code: null, type: "invalid_request_error" } })],
    ] as const) {
      expect(as(p, e)).toMatchObject({ kind: "model", title: "some-model isn't available any more", action: { label: "Choose a model", href: "/settings" } });
    }
    expect(as("gemini", api(404, { error: { code: 404, status: "NOT_FOUND" } })).message).toBe(
      "Gemini may have retired or renamed this model, or your key can't use it. Choose another model and try again."
    );
  });

  it("an empty account is told apart from a busy provider", () => {
    expect(as("openai", api(429, { error: { message: "You exceeded your current quota", type: "insufficient_quota", code: "insufficient_quota" } }))).toMatchObject({
      kind: "quota",
      title: "Your OpenAI account is out of credit",
      action: { label: "Open OpenAI console", href: "https://platform.openai.com/api-keys", external: true },
    });
    expect(as("anthropic", api(400, { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } })).kind).toBe("quota");
    expect(as("anthropic", api(429, { type: "error", error: { type: "rate_limit_error" } }))).toMatchObject({ kind: "rate", title: "Anthropic is getting too many requests" });
    expect(as("gemini", api(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED" } })).kind).toBe("rate");
    expect(as("anthropic", api(529, { type: "error", error: { type: "overloaded_error" } }))).toMatchObject({ kind: "busy", title: "Anthropic is having trouble right now" });
    expect(as("openai", api(503, {})).kind).toBe("busy");
  });

  it("unwraps the SDK's own retries and handles network failures and unknown errors", () => {
    const busy = api(503, {});
    expect(as("openai", new RetryError({ message: "failed after 3 attempts", reason: "maxRetriesExceeded", errors: [busy, busy, busy] })).kind).toBe("busy");
    expect(as("openai", new APICallError({ message: "Cannot connect to API", url: "u", requestBodyValues: {}, isRetryable: true }))).toMatchObject({
      kind: "network",
      title: "Couldn't reach OpenAI",
      message: "Check your internet connection and try again.",
    });
    expect(as("openai", new TypeError("Failed to fetch")).kind).toBe("network");
    expect(as("openai", api(418, {}))).toMatchObject({ kind: "other", title: "Something went wrong with OpenAI", detail: "418" });
    expect(as("openai", new Error("boom")).kind).toBe("other");
  });

  it("output that fails validation is an output error; an LlmError passes through unchanged", () => {
    const bad = new NoObjectGeneratedError({ message: "no object", text: "{}", response: { id: "1", timestamp: new Date(0), modelId: "m" }, usage: {} as never, finishReason: "stop" });
    expect(as("openai", bad)).toMatchObject({ kind: "output", title: "The model's answer couldn't be used" });
    const own = new LlmError("setup", "No model connected", "Add an API key in Settings to start generating.");
    expect(as("openai", own)).toBe(own);
  });

  it("never puts a key in the message or detail", () => {
    const e = as("openai", api(401, { error: { message: "Incorrect API key provided: sk-proj-abc123", code: "invalid_api_key" } }));
    expect(JSON.stringify(e) + e.message).not.toContain("sk-proj-abc123");
  });
});
