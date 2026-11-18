import { expect, test } from "@playwright/test";
import { PROVIDERS, testKey, type ProviderId } from "../../lib/llm/providers";

// SPEC §8.1 opt-in CORS check: real calls from real Chromium through the real adapter (POST preflight and CSP
// included), plus a check that every listed model ID still exists. Skipped unless keys are set:
//   ANTHROPIC_API_KEY=… OPENAI_API_KEY=… GEMINI_API_KEY=… pnpm test:e2e tests/e2e/cors.spec.ts
const KEYS: Record<ProviderId, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
};

for (const p of PROVIDERS) {
  test(`${p.name}: a structured call works from the browser, and every listed model exists`, async ({ page }) => {
    const key = KEYS[p.id];
    test.skip(!key, `set ${p.id.toUpperCase()}_API_KEY to run`);
    await page.goto("/dev/llm");
    await page.getByLabel("Provider").selectOption(p.id);
    await page.getByLabel("API key").fill(key!);
    await page.getByRole("button", { name: "Run test call" }).click();
    await expect(page.getByTestId("probe-result")).toContainText('"ok":true', { timeout: 60_000 });

    // the model list check needs no browser: a GET from this test process
    const result = await testKey(p.id, key!);
    expect(result).toEqual({ ok: true, available: p.models }); // a missing ID means providers.ts needs updating
  });
}
