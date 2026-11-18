import { expect, test, type Page } from "@playwright/test";
import { makeProject, SUMMARY } from "./projects";

// SPEC §14.5 History drawer, revision banner and inspector lock (TASK-22).
const drawer = (page: Page) => page.getByRole("dialog", { name: "History" });
const inspector = (page: Page) => page.getByRole("complementary", { name: "Inspector" });
const rows = (page: Page) => drawer(page).getByRole("list", { name: "Revisions" }).getByRole("button");
const LOCK = "You're viewing an older revision. Restore it or go back to the current version to edit.";

async function openWithMove(page: Page) {
  const { id } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  await expect(page.getByRole("region", { name: "Preview" }).locator("[data-sheet] svg").first()).toBeVisible({ timeout: 30_000 });
  await inspector(page).getByRole("tab", { name: "Structure" }).click();
  await inspector(page).getByRole("button", { name: "Move down" }).first().click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "History" }).click();
  return id;
}

test("the drawer lists revisions newest first with labels, times and Current; Escape closes it (AC1, DoD)", async ({ page }) => {
  test.setTimeout(60_000);
  await openWithMove(page);
  await expect(drawer(page)).toContainText("Every change to the resume is saved here automatically. Select one to preview it.");
  await expect(drawer(page).getByRole("button", { name: "Close history" })).toBeFocused();
  await expect(rows(page)).toHaveText([/^Moved Summary down\s*Today, \d{1,2}:\d{2} [ap]m\s*Current$/, /^Generated from job brief\s*Today, \d{1,2}:\d{2} [ap]m, used the LLM$/]);
  await page.keyboard.press("Escape");
  await expect(drawer(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "History" })).toBeFocused();
});

test("previewing an old revision shows the banner and locks the inspector; Back to current and closing leave it (AC2)", async ({ page }) => {
  test.setTimeout(60_000);
  await openWithMove(page);
  await rows(page).nth(1).click();
  const banner = page.getByRole("region", { name: "Preview" }).getByText(/^Viewing the revision from Today, .*: Generated from job brief$/);
  await expect(banner).toBeVisible();
  await expect(inspector(page).getByText(LOCK)).toBeVisible();
  const content = inspector(page).getByRole("tab", { name: "Content" });
  expect(await content.evaluate((el: HTMLElement) => (el.focus(), document.activeElement === el))).toBe(false); // inert: it can't take focus
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Back to current" }).click();
  await expect(banner).toBeHidden();
  await expect(inspector(page).getByText(LOCK)).toBeHidden();

  await rows(page).nth(1).click();
  await expect(banner).toBeVisible();
  await drawer(page).getByRole("button", { name: "Close history" }).click();
  await expect(banner).toBeHidden();
  await expect(inspector(page).getByRole("tab", { name: "Content" })).toBeVisible();
});

test("Restore adds a restore revision and keeps the later ones (AC3)", async ({ page }) => {
  test.setTimeout(60_000);
  const id = await openWithMove(page);
  await rows(page).nth(1).click();
  await page.getByRole("button", { name: "Restore this version" }).click();
  await expect(page.getByText("Restored. The version you replaced is still in history.")).toBeVisible();
  await expect(rows(page).first()).toContainText(/Restored the version from Today, .*Current/);
  await expect(rows(page)).toHaveCount(3);
  await expect(inspector(page).getByRole("button", { name: /Summary/ }).first()).toBeVisible();

  const { documents } = await (await page.request.get(`/api/projects/${id}`)).json();
  const resume = documents.find((d: { kind: string }) => d.kind === "resume");
  expect(resume.sections.map((s: { id: string }) => s.id)).toEqual(["s-sum", "s-exp"]); // the generated order is back
  const revs = await (await page.request.get(`/api/documents/${resume.id}/revisions`)).json();
  expect(revs.map((r: { kind: string; label: string }) => [r.kind, r.label.replace(/Today, .*/, "Today")])).toEqual([
    ["restore", "Restored the version from Today"],
    ["structure", "Moved Summary down"],
    ["generation", "Generated from job brief"],
  ]);
  expect(resume.sections[0].text).toBe(SUMMARY);
});
