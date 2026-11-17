import { describe, expect, it, vi } from "vitest";
import { keyFormatError, maskKey, PROVIDERS, testKey } from "@/lib/llm/providers";

// SPEC §8.1, §8.2 validation order, §18.1 Key validation.
const LONG = "x".repeat(30);

describe("keyFormatError", () => {
  it("checks empty, then prefix, then length, with the provider's own article", () => {
    expect(keyFormatError("anthropic", "  ")).toBe("Paste your API key first");
    expect(keyFormatError("anthropic", `sk-${LONG}`)).toBe('That doesn\'t look like an Anthropic key. Anthropic keys start with "sk-ant-".');
    expect(keyFormatError("openai", `AIza${LONG}`)).toBe('That doesn\'t look like an OpenAI key. OpenAI keys start with "sk-".');
    expect(keyFormatError("gemini", `sk-${LONG}`)).toBe('That doesn\'t look like a Gemini key. Gemini keys start with "AIza".');
    expect(keyFormatError("openai", "sk-short")).toBe("That key looks too short. Copy the whole key from your provider dashboard.");
    expect(keyFormatError("openai", `sk-${LONG}`)).toBeNull();
  });

  it("rejects an Anthropic key pasted as OpenAI", () => {
    expect(keyFormatError("openai", `sk-ant-${LONG}`)).toBe('That doesn\'t look like an OpenAI key. OpenAI keys start with "sk-".');
  });
});

it("masks a key to its prefix and last four characters", () => {
  expect(maskKey("anthropic", "sk-ant-api03-abcdefgha9F2")).toBe("sk-ant-…a9F2");
});

it("lists the three providers with models", () => {
  expect(PROVIDERS.map((p) => p.id)).toEqual(["anthropic", "openai", "gemini"]);
  for (const p of PROVIDERS) expect(p.models.length).toBeGreaterThan(0);
});

describe("testKey", () => {
  const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

  it("accepts a key the provider accepts, calling the models endpoint from the browser", async () => {
    const f = reply(200, { data: [] });
    expect(await testKey("anthropic", "sk-ant-KEY", f)).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/models");
    expect(init.headers).toMatchObject({ "x-api-key": "sk-ant-KEY", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" });
  });

  it("sends a Gemini key in a header, not the URL", async () => {
    const f = reply(200, {});
    await testKey("gemini", "AIzaKEY", f);
    const [url, init] = f.mock.calls[0];
    expect(url).not.toContain("AIzaKEY");
    expect(init.headers).toMatchObject({ "x-goog-api-key": "AIzaKEY" });
  });

  it("explains a rejected key with the provider's status and code", async () => {
    expect(await testKey("anthropic", "k", reply(401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }))).toEqual({
      ok: false,
      message: "Anthropic rejected this key (401 authentication_error). Check the key is active and copied in full.",
    });
    expect(await testKey("openai", "k", reply(401, { error: { code: "invalid_api_key" } }))).toEqual({
      ok: false,
      message: "OpenAI rejected this key (401 invalid_api_key). Check the key is active and copied in full.",
    });
    expect(await testKey("gemini", "k", reply(400, { error: { code: 400, status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } }))).toEqual({
      ok: false,
      message: "Gemini rejected this key (400 API_KEY_INVALID). Check the key is active and copied in full.",
    });
  });

  it("tells a network failure or a provider outage apart from a bad key", async () => {
    expect(await testKey("openai", "k", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))).toEqual({
      ok: false,
      message: "Couldn't reach OpenAI. Check your connection and try again.",
    });
    expect(await testKey("openai", "k", reply(503, {}))).toEqual({ ok: false, message: "OpenAI couldn't check the key right now (503). Try again in a moment." });
  });
});
