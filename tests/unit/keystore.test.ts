import { expect, it } from "vitest";
import { decrypt, encrypt, newCryptoKey } from "@/lib/keystore";

// SPEC §8.2 storage, §18.1 Crypto: AES-GCM with a non-extractable key and a random IV.
it("round-trips a key, with a fresh IV each time, and never exposes the plaintext or the CryptoKey", async () => {
  const key = await newCryptoKey();
  expect(key.extractable).toBe(false);
  const a = await encrypt(key, "sk-ant-secret-value-1234");
  const b = await encrypt(key, "sk-ant-secret-value-1234");
  expect(a.iv).toHaveLength(12);
  expect(Buffer.from(a.iv).equals(Buffer.from(b.iv))).toBe(false);
  expect(Buffer.from(a.ciphertext).toString("latin1")).not.toContain("secret");
  expect(await decrypt(key, a)).toBe("sk-ant-secret-value-1234");
  await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
});

it("reads the active model from storage, and only falls back to memory when storage is blocked", async () => {
  const { getActiveModel, setActiveModel } = await import("@/lib/keystore");
  const store = new Map<string, string>();
  globalThis.window = Object.assign(new EventTarget(), {}) as never;
  globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) } as never;
  setActiveModel({ provider: "anthropic", model: "claude-opus-5-5" });
  expect(getActiveModel()).toEqual({ provider: "anthropic", model: "claude-opus-5-5" });
  store.clear(); // another tab removed it
  expect(getActiveModel()).toBeNull();
  globalThis.localStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} } as never;
  setActiveModel({ provider: "gemini", model: "gemini-3.8-flash" });
  expect(getActiveModel()).toEqual({ provider: "gemini", model: "gemini-3.8-flash" });
});
