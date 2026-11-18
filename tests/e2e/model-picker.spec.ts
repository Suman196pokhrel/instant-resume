import { expect, test, type Page } from "@playwright/test";

// SPEC §8.2 Active model, §18.2 Model picker, §8.3 Errors. Provider endpoints are stubbed; nothing leaves the test.
const card = (page: Page, name: string) => page.locator("[data-provider]").filter({ has: page.getByRole("heading", { name, exact: true }) });
const picker = (page: Page) => page.getByRole("button", { name: /Change model/ });

/** Stubs the providers: model lists offer `models`; any other call answers with `status` and `body`. */
async function stubProviders(page: Page, models: string[], status = 200, body: unknown = {}) {
  await page.route(/api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com/, (route) =>
    route.fulfill({
      status: route.request().url().includes("/models?") ? 200 : status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
      body: JSON.stringify(route.request().url().includes("/models?") ? { data: models.map((id) => ({ id })) } : body),
    })
  );
}

async function connect(page: Page, name: string, key: string) {
  await card(page, name).getByLabel("API key").fill(key);
  await card(page, name).getByRole("button", { name: "Test and save" }).click();
  await expect(card(page, name).getByText("Encrypted on this device", { exact: true })).toBeVisible();
}

test("with no key, the picker says so and links each provider to Settings", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(picker(page)).toHaveText("No model connected");
  await picker(page).click();
  for (const name of ["Add an Anthropic key", "Add an OpenAI key", "Add a Gemini key"]) await expect(page.getByRole("menuitem", { name })).toBeVisible();
  await expect(page.getByText("Calls go straight from this browser to the provider.")).toBeVisible();
  await page.getByRole("menuitem", { name: "Add a Gemini key" }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("lists only the models a connected key can use, and switching updates every view at once (AC1)", async ({ page }) => {
  await stubProviders(page, ["claude-sonnet-5-5", "claude-opus-5-5", "gemini-3.8-flash"]);
  await page.goto("/settings");
  await connect(page, "Anthropic", "sk-ant-api03-test-key-0123456789a9F2");
  await expect(picker(page)).toHaveText("Anthropic claude-sonnet-5-5");
  await connect(page, "Gemini", "AIzaSyTestKey0123456789abcd");

  await picker(page).click();
  await expect(page.getByRole("menuitemradio")).toHaveText(["claude-sonnet-5-5", "claude-opus-5-5", "gemini-3.8-flash"]); // haiku and pro aren't offered
  await page.getByRole("menuitemradio", { name: "gemini-3.8-flash" }).click();
  await expect(page.getByText("Switched to gemini-3.8-flash")).toBeVisible();
  await expect(picker(page)).toHaveText("Gemini gemini-3.8-flash");
  await expect(card(page, "Gemini").getByText("In use")).toBeVisible(); // Settings follows without a reload
  await expect(card(page, "Anthropic").getByText("In use")).toHaveCount(0);

  await picker(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitemradio", { name: "gemini-3.8-flash" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: "claude-opus-5-5" }).focus();
  await page.keyboard.press("Enter");
  await expect(picker(page)).toHaveText("Anthropic claude-opus-5-5");

  await page.goto("/kb/roles");
  await expect(picker(page)).toHaveText("Anthropic claude-opus-5-5"); // the choice is kept across pages
});

test("a failed call explains what went wrong and what to do (SPEC §8.3)", async ({ page }) => {
  await stubProviders(page, [], 404, { type: "error", error: { type: "not_found_error", message: "model: claude-sonnet-5-5" } });
  await page.goto("/dev/llm");
  await page.getByLabel("API key").fill("sk-ant-api03-test-key-0123456789a9F2");
  await page.getByRole("button", { name: "Run test call" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "isn't available" });
  await expect(alert).toContainText("claude-sonnet-5-5 isn't available any more");
  await expect(alert).toContainText("Anthropic may have retired or renamed this model, or your key can't use it. Choose another model and try again.");
  await expect(alert).toContainText("Details: 404 not_found_error");
  await expect(alert.getByRole("link", { name: "Choose a model" })).toHaveAttribute("href", "/settings");
});

test("a revoked key points back to Settings", async ({ page }) => {
  await stubProviders(page, [], 401, { error: { message: "Incorrect API key provided", code: "invalid_api_key" } });
  await page.goto("/dev/llm");
  await page.getByLabel("Provider").selectOption("openai");
  await page.getByLabel("API key").fill("sk-proj-test-key-0123456789abcd");
  await page.getByRole("button", { name: "Run test call" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "didn't accept" });
  await expect(alert).toContainText("OpenAI didn't accept your API key");
  await expect(alert.getByRole("link", { name: "Open Settings" })).toBeVisible();
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
});
