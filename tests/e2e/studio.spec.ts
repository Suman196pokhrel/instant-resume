import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PROVIDERS } from "../../lib/llm/providers";

// SPEC §14.2 chooser, §14.4 Studio setup (steps 1-3), on the seeded KB (Jordan Whitlock) with the mock provider.
const MINTLEAF = readFileSync(join(__dirname, "../fixtures/jds/mintleaf.txt"), "utf8");
const h1 = (page: Page) => page.getByRole("heading", { level: 1 });
const keyword = (page: Page, k: string) => page.getByRole("list", { name: "Keywords" }).locator("[data-slot=chip]").filter({ hasText: new RegExp(`^${k.replace(".", "\\.")}`) });

async function connectAnthropic(page: Page) {
  await page.route(/api\.anthropic\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ data: PROVIDERS[0].models.map((id) => ({ id })) }) })
  );
  await page.goto("/settings");
  const card = page.locator("[data-provider=anthropic]");
  await card.getByLabel("API key").fill("sk-ant-api03-test-key-0123456789a9F2");
  await card.getByRole("button", { name: "Test and save" }).click();
  await expect(card.getByText("Encrypted on this device", { exact: true })).toBeVisible();
}

test("the chooser offers Quick generate first and Studio second", async ({ page }) => {
  await page.goto("/new");
  await expect(h1(page)).toHaveText("New application");
  await expect(page.getByRole("link", { name: /Quick generate/ })).toHaveAttribute("href", "/new/quick");
  await expect(page.getByRole("link", { name: /Quick generate/ })).toContainText("Recommended");
  await page.getByRole("link", { name: /Open in Studio/ }).click();
  await expect(h1(page)).toHaveText("Paste the job description");
});

test("Extract waits for a connection and real text (AC1)", async ({ page }) => {
  await page.goto("/new/studio");
  await expect(page.getByText("No API key connected.")).toBeVisible();
  await page.getByLabel("Job description").fill(MINTLEAF);
  await expect(page.getByRole("button", { name: "Extract requirements" })).toBeDisabled();
  await connectAnthropic(page);
  await page.goto("/new/studio");
  await expect(page.getByLabel("Job description")).toHaveValue(MINTLEAF); // the draft survived navigation
  await page.getByLabel("Job description").fill("");
  await expect(page.getByRole("button", { name: "Extract requirements" })).toBeDisabled();
  await page.getByLabel("Job description").fill("Engineer wanted");
  await page.getByRole("button", { name: "Extract requirements" }).click();
  await expect(page.getByText("That looks too short to be a full job description. Paste the whole ad, including requirements.")).toBeVisible();
});

test("the brief shows what was extracted, marks backed keywords, and keeps edits and notes (AC2, AC4)", async ({ page }) => {
  await connectAnthropic(page);
  await page.goto("/new/studio");
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByRole("button", { name: /Notes for this application/ }).click();
  await page.getByRole("textbox", { name: "Notes for this application" }).fill("Referred by Dana Okafor");
  await page.getByRole("button", { name: "Extract requirements" }).click();
  await expect(page.getByText("Reading the job description with claude-sonnet-5-5…")).toBeVisible();
  await expect(h1(page)).toHaveText("Job brief");
  await expect(page.getByText("Extracted by claude-sonnet-5-5")).toBeVisible();
  await expect(page.getByLabel("Company")).toHaveValue("Mintleaf");
  await expect(page.getByRole("heading", { name: /Requirements/ })).toContainText("5");
  await expect(page.getByText("Full working rights in Australia are required. Your knowledge base says: Australian citizen.")).toBeVisible();
  const chips = page.getByRole("list", { name: "Keywords" }).locator("[data-slot=chip]");
  await expect(chips).toHaveCount(12);
  await expect(keyword(page, "React")).toHaveAttribute("data-backed", "true");

  await page.getByRole("button", { name: "Remove Terraform" }).click();
  await page.getByLabel("Add a keyword").fill("Kubernetes");
  await page.keyboard.press("Enter");
  await expect(keyword(page, "Kubernetes")).toHaveAttribute("data-backed", "false");
  await expect(chips).toHaveCount(12);
  await page.getByLabel("Role").fill("Senior Full Stack Engineer (Payments)");

  await page.reload();
  await expect(h1(page)).toHaveText("Job brief");
  await expect(page.getByLabel("Role")).toHaveValue("Senior Full Stack Engineer (Payments)");
  await expect(keyword(page, "Terraform")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit job description" }).click();
  await expect(page.getByRole("textbox", { name: "Notes for this application" })).toHaveValue("Referred by Dana Okafor");
});

test("suggested entries are pre-ticked and coverage updates live (AC3)", async ({ page }) => {
  await connectAnthropic(page);
  await page.goto("/new/studio");
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByRole("button", { name: "Extract requirements" }).click();
  await page.getByRole("button", { name: "Choose entries" }).click();
  await expect(h1(page)).toHaveText("Choose what to draw on");
  // Other specs add entries to the shared KB in parallel, so counts are read from the page.
  const covers = page.getByText(/^Covers \d+ of 12 keywords$/);
  const picked = page.getByText(/^\d+ of \d+ selected$/);
  const count = async () => Number((await picked.textContent())!.split(" ")[0]);
  await expect(page.getByText("Covers 12 of 12 keywords")).toBeVisible();
  const before = await count();
  const brightwater = page.getByRole("checkbox", { name: /Senior Software Engineer, Brightwater Logistics/ }).first();
  await expect(brightwater).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Ledgerline/ }).first()).not.toBeChecked();
  await expect(page.getByText(/Matches React, TypeScript/).first()).toBeVisible();
  await expect(page.getByText("Runs on claude-sonnet-5-5, about 6,000 tokens")).toBeVisible();

  await brightwater.click();
  await expect.poll(count).toBe(before - 1);
  await expect(covers).not.toHaveText("Covers 12 of 12 keywords"); // Mentoring and Testing came only from Brightwater

  const ticked = page.getByRole("checkbox", { checked: true });
  while (await ticked.count()) await ticked.first().click();
  await expect(picked).toHaveText(/^0 of \d+ selected$/);
  await page.getByRole("button", { name: "Generate resume and cover letter" }).click();
  await expect(page.getByText("Select at least one knowledge base entry")).toBeVisible();
});

test("a failed extraction explains itself and Try again works without pasting again (AC5)", async ({ page }) => {
  await connectAnthropic(page);
  await page.goto("/new/studio?mock=brief-error");
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByRole("button", { name: "Extract requirements" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "having trouble" });
  await expect(alert).toContainText("Anthropic is having trouble right now");
  await expect(page.getByLabel("Job description")).toHaveValue(MINTLEAF);
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(h1(page)).toHaveText("Job brief");
});
