import { expect, test, type Page } from "@playwright/test";
import { makeProject, SUMMARY } from "./projects";

// SPEC §14.5 Workspace: bar, preview and Content inspector with hand edits and autosave (TASK-15).
const preview = (page: Page) => page.getByRole("region", { name: "Preview" });
const sheet = (page: Page) => preview(page).locator("[data-sheet] svg").first();

test("the Workspace shows the bar, a rendered preview and the sections (AC4)", async ({ page }) => {
  test.setTimeout(60_000);
  const { id, role } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  const bar = page.locator("header", { has: page.getByRole("tablist", { name: "Document" }) });
  await expect(bar.getByRole("link", { name: "Applications" })).toHaveAttribute("href", "/dashboard");
  await expect(page.getByText(`${role} at Southerly Energy`)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Resume" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  await expect(preview(page).getByText(/^Rendered in \d+ ms · 1 page · A4$/)).toBeVisible();
  await expect(preview(page).getByRole("button", { name: "Fit to width" })).toHaveText(/^\d+% fit$/);
  await preview(page).getByRole("button", { name: "Zoom in" }).click();
  await expect(preview(page).getByRole("button", { name: "Fit to width" })).toHaveText(/^\d+%$/);

  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await expect(inspector.getByRole("heading", { name: "Sections" })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /Summary/ })).toContainText(SUMMARY);
  await page.getByRole("tab", { name: "Cover letter" }).click();
  await expect(inspector.getByRole("heading", { name: "Paragraphs" })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /Opening/ })).toBeVisible();
});

test("typing updates the preview, saves, and survives a reload (AC1, AC2, DoD)", async ({ page }) => {
  test.setTimeout(60_000);
  const { id } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  const before = await sheet(page).innerHTML();

  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByRole("button", { name: /Summary/ }).focus();
  await page.keyboard.press("Enter");
  await expect(inspector.getByText("Updates the preview as you type")).toBeVisible();
  const text = inspector.getByRole("textbox", { name: "Summary text" });
  await text.fill(`${SUMMARY} Mentored three graduates.`);
  await expect(page.getByText("Saving", { exact: true })).toBeVisible();
  await expect.poll(() => sheet(page).innerHTML(), { timeout: 10_000 }).not.toBe(before);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

  await inspector.getByRole("textbox", { name: "Section heading" }).fill("Profile");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await inspector.getByRole("button", { name: /Profile/ }).click();
  await expect(inspector.getByRole("textbox", { name: "Profile text" })).toHaveValue(`${SUMMARY} Mentored three graduates.`);
  await inspector.getByRole("button", { name: "All sections" }).click();

  await inspector.getByRole("button", { name: /Experience/ }).click();
  await inspector.getByRole("textbox", { name: "Bullet 1" }).fill("Cut page load to 1.1s");
  await inspector.getByRole("button", { name: "Remove bullet 1" }).click();
  await expect(inspector.getByRole("textbox", { name: "Bullet 1" })).toHaveCount(0);
});

test("Copy puts the document's plain text on the clipboard (AC3)", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { id } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  await page.getByRole("button", { name: "Copy as plain text" }).click();
  await expect(page.getByText("Resume copied as plain text")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^Jordan Whitlock\n/);
  expect(text).toContain(`\nSUMMARY\n${SUMMARY}`);
  expect(text).toContain("• Cut page load from 4.2s to 1.1s");
});

test("an unknown project is a 404", async ({ page }) => {
  expect((await page.goto("/projects/p-nope"))?.status()).toBe(404);
});
