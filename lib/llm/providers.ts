// Providers, key checks and the key test call (SPEC §8.1, §8.2). Calls go straight from the browser to the
// provider; keys never reach the Next.js server. All three providers allow these calls from a browser (CORS).

export type ProviderId = "anthropic" | "openai" | "gemini";
export type Provider = { id: ProviderId; name: string; prefix: string; keyUrl: string; models: string[] };

// Models change often: update these from each provider's model page (checked 2026-11-18). The first is the
// default. A key test keeps only the ones the key's models list still offers, so retired IDs drop out.
export const PROVIDERS: Provider[] = [
  { id: "anthropic", name: "Anthropic", prefix: "sk-ant-", keyUrl: "https://console.anthropic.com/settings/keys", models: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"] },
  { id: "openai", name: "OpenAI", prefix: "sk-", keyUrl: "https://platform.openai.com/api-keys", models: ["gpt-6.2-sol", "gpt-6.2-astra", "gpt-6-luna"] },
  { id: "gemini", name: "Gemini", prefix: "AIza", keyUrl: "https://aistudio.google.com/apikey", models: ["gemini-3.8-flash", "gemini-3.1-pro-preview"] },
];
export const provider = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;

/** "an OpenAI", "an Anthropic", "a Gemini". */
export const withArticle = (name: string) => `${/^[AEIOU]/.test(name) ? "an" : "a"} ${name}`;

/** The first problem with a pasted key, before any request (SPEC §8.2 validation order), or null. */
export function keyFormatError(id: ProviderId, raw: string): string | null {
  const key = raw.trim();
  const p = provider(id);
  if (!key) return "Paste your API key first";
  if (!key.startsWith(p.prefix) || (id === "openai" && key.startsWith("sk-ant-"))) {
    return `That doesn't look like ${withArticle(p.name)} key. ${p.name} keys start with "${p.prefix}".`;
  }
  if (key.length < 20) return "That key looks too short. Copy the whole key from your provider dashboard.";
  return null;
}

export const maskKey = (id: ProviderId, key: string) => `${provider(id).prefix}…${key.slice(-4)}`;

/** A free request that only succeeds with a working key: each provider's models list. */
function testRequest(id: ProviderId, key: string): [string, RequestInit] {
  switch (id) {
    case "anthropic":
      return ["https://api.anthropic.com/v1/models?limit=1000", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } }];
    case "openai":
      return ["https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } }];
    case "gemini":
      return ["https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", { headers: { "x-goog-api-key": key } }];
  }
}

export type ErrorBody = { error?: { type?: string; code?: string | number | null; status?: string; message?: string; details?: { reason?: string }[] } };

/** The provider's own name for the error: Anthropic error.type, OpenAI error.code, Gemini details[].reason or status. */
export const errorCode = (b: ErrorBody) =>
  b.error?.details?.find((d) => d.reason)?.reason ?? (typeof b.error?.code === "string" ? b.error.code : (b.error?.type ?? b.error?.status)) ?? "";

type ModelsBody = { data?: { id?: unknown }[]; models?: { name?: unknown }[] };

/** Our models that the provider's list offers; all of them when the list can't be read. */
function offered(id: ProviderId, body: ModelsBody): string[] {
  const { models } = provider(id);
  const list = Array.isArray(body.data) ? body.data.map((m) => m.id) : Array.isArray(body.models) ? body.models.map((m) => String(m.name).replace(/^models\//, "")) : null;
  return list ? models.filter((m) => list.includes(m)) : models;
}

/** Checks the key with the provider. Gemini answers a bad key with 400 API_KEY_INVALID rather than 401. */
export async function testKey(id: ProviderId, key: string, fetchImpl: typeof fetch = fetch): Promise<{ ok: true; available: string[] } | { ok: false; message: string }> {
  const { name } = provider(id);
  let res: Response;
  try {
    res = await fetchImpl(...testRequest(id, key.trim()));
  } catch {
    return { ok: false, message: `Couldn't reach ${name}. Check your connection and try again.` };
  }
  if (res.ok) return { ok: true, available: offered(id, await res.json().catch(() => ({}))) };
  const code = errorCode(await res.json().catch(() => ({})));
  if (res.status === 401 || res.status === 403 || code === "API_KEY_INVALID") {
    return { ok: false, message: `${name} rejected this key (${[res.status, code].filter(Boolean).join(" ")}). Check the key is active and copied in full.` };
  }
  return { ok: false, message: `${name} couldn't check the key right now (${res.status}). Try again in a moment.` };
}
