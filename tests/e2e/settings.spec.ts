import { expect, test, type Page } from "@playwright/test";
import { PROVIDERS } from "../../lib/llm/providers";

// SPEC §8.2 connections and key storage, §18.4 #2. Provider endpoints are stubbed; nothing leaves the test.
const ANTHROPIC = "sk-ant-api03-test-key-0123456789a9F2";
const card = (page: Page, name: string) => page.locator("[data-provider]").filter({ has: page.getByRole("heading", { name, exact: true }) });

const EVERY_MODEL = { data: PROVIDERS.flatMap((p) => p.models).map((id) => ({ id })) };

/** Stubs every provider's models endpoint, records the calls, and fails if one has the given status. */
async function stubProviders(page: Page, status = 200, body: unknown = EVERY_MODEL) {
  const calls: string[] = [];
  await page.route(/api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com/, (route) => {
    calls.push(route.request().url());
    return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  });
  return calls;
}

test("shows a connection card for each provider and the key guide (AC1)", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.locator("[data-provider]")).toHaveCount(3);
  for (const name of ["Anthropic", "OpenAI", "Gemini"]) await expect(card(page, name)).toContainText("Not connected");
  await page.getByRole("button", { name: "How to get an API key" }).click();
  await expect(page.getByRole("link", { name: /Anthropic/ })).toHaveAttribute("target", "_blank");
});

test("a wrong-prefix key is caught before any request (AC2)", async ({ page }) => {
  const calls = await stubProviders(page);
  await page.goto("/settings");
  const openai = card(page, "OpenAI");
  await openai.getByLabel("API key").fill(ANTHROPIC);
  await openai.getByRole("button", { name: "Test and save" }).click();
  await expect(openai.getByText('That doesn\'t look like an OpenAI key. OpenAI keys start with "sk-".')).toBeVisible();
  await expect(openai.getByLabel("API key")).toBeFocused();
  await openai.getByRole("button", { name: "Test and save" }).click();
  await openai.getByLabel("API key").fill("");
  await openai.getByRole("button", { name: "Test and save" }).click();
  await expect(openai.getByText("Paste your API key first")).toBeVisible();
  expect(calls).toEqual([]);
});

test("a rejected key shows the provider's reason and is not saved (AC3)", async ({ page }) => {
  const calls = await stubProviders(page, 401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } });
  await page.goto("/settings");
  const anthropic = card(page, "Anthropic");
  await anthropic.getByLabel("API key").fill(ANTHROPIC);
  await anthropic.getByRole("button", { name: "Test and save" }).click();
  await expect(anthropic.getByText("Anthropic rejected this key (401 authentication_error). Check the key is active and copied in full.")).toBeVisible();
  expect(calls).toEqual(["https://api.anthropic.com/v1/models?limit=1000"]);
  await page.reload();
  await expect(card(page, "Anthropic")).toContainText("Not connected");
});

test("a working key is saved encrypted in this browser only, shown masked, and becomes active (AC4)", async ({ page }) => {
  await stubProviders(page);
  const toApp: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).host === new URL(page.url() || "http://127.0.0.1:3100").host) toApp.push(`${r.url()} ${r.postData() ?? ""} ${JSON.stringify(r.headers())}`);
  });
  await page.goto("/settings");
  const anthropic = card(page, "Anthropic");
  await anthropic.getByLabel("API key").fill(ANTHROPIC);
  await anthropic.getByRole("button", { name: "Show" }).click();
  await expect(anthropic.getByLabel("API key")).toHaveAttribute("type", "text");
  await expect(anthropic.getByLabel("API key")).toHaveAttribute("spellcheck", "false");
  await anthropic.getByRole("button", { name: "Test and save" }).click();
  await expect(anthropic.getByText("Key works. Saved and encrypted on this device.")).toBeVisible();
  await expect(page.getByText("Anthropic connected")).toBeVisible();
  await expect(anthropic.getByText("sk-ant-…a9F2")).toBeVisible();
  await expect(anthropic.getByText("Encrypted on this device", { exact: true })).toBeVisible();
  await expect(anthropic.getByText("In use")).toBeVisible();

  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("instant-resume-keystore");
      r.onsuccess = () => resolve(r.result);
    });
    const get = <T,>(store: string, key: string) =>
      new Promise<T>((resolve) => {
        const r = db.transaction(store).objectStore(store).get(key);
        r.onsuccess = () => resolve(r.result as T);
      });
    const row = await get<{ ciphertext: ArrayBuffer; iv: Uint8Array; masked: string }>("connections", "anthropic");
    const key = await get<CryptoKey>("keys", "aes");
    return {
      plain: JSON.stringify(row) + new TextDecoder("latin1").decode(row.ciphertext),
      ivLength: row.iv.length,
      extractable: key.extractable,
      local: JSON.stringify(localStorage),
    };
  });
  expect(stored.plain).not.toContain("test-key-0123456789");
  expect(stored.ivLength).toBe(12);
  expect(stored.extractable).toBe(false);
  expect(stored.local).not.toContain("test-key");
  expect(JSON.parse(JSON.parse(stored.local)["instant-resume-active-model"])).toEqual({ provider: "anthropic", model: "claude-sonnet-5-5" });

  await page.reload();
  await expect(card(page, "Anthropic").getByText("sk-ant-…a9F2")).toBeVisible();
  expect(toApp.filter((r) => r.includes("test-key"))).toEqual([]); // the key never reaches the app's server
});

test("Use switches the active provider, and Remove key falls back to another connection", async ({ page }) => {
  await stubProviders(page);
  await page.goto("/settings");
  for (const [name, key] of [
    ["Anthropic", ANTHROPIC],
    ["Gemini", "AIzaSyTestKey0123456789abcd"],
  ]) {
    await card(page, name).getByLabel("API key").fill(key);
    await card(page, name).getByRole("button", { name: "Test and save" }).click();
    await expect(card(page, name).getByText("Encrypted on this device", { exact: true })).toBeVisible();
  }
  await expect(card(page, "Anthropic").getByText("In use")).toBeVisible(); // the first connection stays active
  await card(page, "Gemini").getByLabel("Default model").selectOption("gemini-3.1-pro-preview");
  await card(page, "Gemini").getByRole("button", { name: "Use Gemini" }).click();
  await expect(page.getByText("Now using gemini-3.1-pro-preview")).toBeVisible();
  await expect(card(page, "Gemini").getByText("In use")).toBeVisible();
  await card(page, "Gemini").getByRole("button", { name: "Remove key" }).click();
  await expect(page.getByText("Gemini key removed")).toBeVisible();
  await expect(card(page, "Gemini")).toContainText("Not connected");
  await expect(card(page, "Anthropic").getByText("In use")).toBeVisible();
});

test("a key that can't use any listed model is saved with a clear warning, not made active", async ({ page }) => {
  await stubProviders(page, 200, { data: [{ id: "gpt-4o" }] });
  await page.goto("/settings");
  const openai = card(page, "OpenAI");
  await openai.getByLabel("API key").fill("sk-proj-test-key-0123456789abcd");
  await openai.getByRole("button", { name: "Test and save" }).click();
  await expect(openai.getByText("None of our listed OpenAI models are available to this key. Update Instant Resume, or try another key.")).toBeVisible();
  await expect(openai.getByText("In use")).toHaveCount(0);
  await expect(openai.getByRole("button", { name: "Use OpenAI" })).toHaveCount(0);
});

// TASK-51, SPEC §13.3 item 2. The PUT is stubbed: the e2e database is shared by parallel tests, so nothing is saved.
test("Quick generate defaults save each change with a toast; tone follows the cover letter switch (AC1)", async ({ page }) => {
  const sent: { quick: Record<string, unknown> }[] = [];
  await page.route("/api/settings", (route) => (sent.push(route.request().postDataJSON()), route.fulfill({ json: sent.at(-1) })));
  await page.goto("/settings");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Quick generate defaults" }) });
  await section.getByLabel("Default theme").selectOption("Modern");
  await expect(page.getByText("Preference saved")).toBeVisible();
  await section.getByRole("radio", { name: "1 page" }).click();
  await section.getByRole("switch", { name: "Cover letter" }).click();
  await expect(section.getByLabel("Cover letter tone")).toBeDisabled();
  await expect.poll(() => sent.length).toBe(3);
  expect(sent.at(-1)).toMatchObject({ paper: "A4", quick: { theme: "modern", pages: 1, coverLetter: false, tone: "Professional" } });
});

test("a preference that fails to save goes back and says so", async ({ page }) => {
  await page.route("/api/settings", (route) => route.fulfill({ status: 500, json: { error: "boom" } }));
  await page.goto("/settings");
  const theme = page.getByLabel("Default theme");
  await theme.selectOption("Compact");
  await expect(page.getByText("Couldn't save that preference. Try again.")).toBeVisible();
  await expect(theme).toHaveValue("classic");
});
