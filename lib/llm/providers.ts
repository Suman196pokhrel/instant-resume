// Providers, key checks and the key test call (SPEC §8.1, §8.2). Calls go straight from the browser to the
// provider; keys never reach the Next.js server. All three providers allow these calls from a browser (CORS).

export type ProviderId = "anthropic" | "openai" | "gemini";
export type Provider = { id: ProviderId; name: string; prefix: string; keyUrl: string; models: string[] };

// shortcut: the model lists are the mock's fixtures; TASK-10 checks them against each provider's models endpoint.
export const PROVIDERS: Provider[] = [
  { id: "anthropic", name: "Anthropic", prefix: "sk-ant-", keyUrl: "https://console.anthropic.com/settings/keys", models: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"] },
  { id: "openai", name: "OpenAI", prefix: "sk-", keyUrl: "https://platform.openai.com/api-keys", models: ["gpt-5.2", "gpt-5.2-mini"] },
  { id: "gemini", name: "Gemini", prefix: "AIza", keyUrl: "https://aistudio.google.com/apikey", models: ["gemini-3-pro", "gemini-3-flash"] },
];
export const provider = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;

/** The first problem with a pasted key, before any request (SPEC §8.2 validation order), or null. */
export function keyFormatError(id: ProviderId, raw: string): string | null {
  const key = raw.trim();
  const p = provider(id);
  if (!key) return "Paste your API key first";
  if (!key.startsWith(p.prefix) || (id === "openai" && key.startsWith("sk-ant-"))) {
    return `That doesn't look like ${/^[AEIOU]/.test(p.name) ? "an" : "a"} ${p.name} key. ${p.name} keys start with "${p.prefix}".`;
  }
  if (key.length < 20) return "That key looks too short. Copy the whole key from your provider dashboard.";
  return null;
}

export const maskKey = (id: ProviderId, key: string) => `${provider(id).prefix}…${key.slice(-4)}`;

/** A free request that only succeeds with a working key: each provider's models list. */
function testRequest(id: ProviderId, key: string): [string, RequestInit] {
  switch (id) {
    case "anthropic":
      return ["https://api.anthropic.com/v1/models", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } }];
    case "openai":
      return ["https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } }];
    case "gemini":
      return ["https://generativelanguage.googleapis.com/v1beta/models", { headers: { "x-goog-api-key": key } }];
  }
}

type ErrorBody = { error?: { type?: string; code?: string | number; status?: string; details?: { reason?: string }[] } };

/** The provider's own name for the error: Anthropic error.type, OpenAI error.code, Gemini details[].reason. */
const errorCode = (b: ErrorBody) => b.error?.details?.find((d) => d.reason)?.reason ?? (typeof b.error?.code === "string" ? b.error.code : b.error?.type) ?? "";

/** Checks the key with the provider. Gemini answers a bad key with 400 API_KEY_INVALID rather than 401. */
export async function testKey(id: ProviderId, key: string, fetchImpl: typeof fetch = fetch): Promise<{ ok: true } | { ok: false; message: string }> {
  const { name } = provider(id);
  let res: Response;
  try {
    res = await fetchImpl(...testRequest(id, key.trim()));
  } catch {
    return { ok: false, message: `Couldn't reach ${name}. Check your connection and try again.` };
  }
  if (res.ok) return { ok: true };
  const code = errorCode(await res.json().catch(() => ({})));
  if (res.status === 401 || res.status === 403 || code === "API_KEY_INVALID") {
    return { ok: false, message: `${name} rejected this key (${[res.status, code].filter(Boolean).join(" ")}). Check the key is active and copied in full.` };
  }
  return { ok: false, message: `${name} couldn't check the key right now (${res.status}). Try again in a moment.` };
}
