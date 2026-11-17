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
