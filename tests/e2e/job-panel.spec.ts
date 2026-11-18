import { expect, test, type Page } from "@playwright/test";
import { makeProject, SUMMARY } from "./projects";

// SPEC §14.5 Job panel, Job tab and Regenerate dialog (TASK-45).
const panel = (page: Page) => page.getByRole("complementary", { name: "Job" });
const sheet = (page: Page) => page.getByRole("region", { name: "Preview" }).locator("[data-sheet] svg").first();
const toggle = (page: Page) => page.getByRole("button", { name: "Show or hide the job panel" });
const job = { requirements: ["Build web apps for customers", "Strong Go skills", "Clear communication"], keywords: ["web apps", "Go", "Kafka"], jdText: "Platform Engineer\nSoutherly Energy\n\nWe build web apps." };

test("the Job tab shows the role, reflected requirements and keyword chips for each document (AC1)", async ({ page }) => {
  test.setTimeout(60_000);
  const { id, role } = await makeProject(page, job);
  await page.goto(`/projects/${id}`);
  const p = panel(page);
  await expect(p.getByRole("heading", { name: role })).toBeVisible();
  await expect(p.getByText("Southerly Energy · Sydney NSW")).toBeVisible();
  const reqs = p.getByRole("region", { name: "Requirements" });
  await expect(reqs.getByText("1 of 2 reflected")).toBeVisible();
  await expect(reqs.locator("li").evaluateAll((els) => els.map((e) => e.getAttribute("data-state")))).resolves.toEqual(["ok", "miss", "none"]);
  await expect(reqs.getByLabel("Reflected", { exact: true })).toHaveCount(1);
  await expect(reqs.getByLabel("Not reflected", { exact: true })).toHaveCount(1);
  const kws = p.getByRole("region", { name: "Keywords" });
  await expect(kws.getByText("1 of 3 in this resume")).toBeVisible();
  await expect(kws.getByLabel("web apps", { exact: true })).toBeVisible();
  await expect(kws.getByLabel("Kafka, missing")).toBeVisible();
  await reqs.getByRole("button", { name: /A requirement is reflected/ }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("A requirement is reflected when a job keyword it mentions appears in this resume. Ones without keywords have no mark.");

  await page.getByRole("tab", { name: "Cover letter" }).click();
  await expect(reqs.getByText("0 of 2 reflected")).toBeVisible();
  await expect(kws.getByText("0 of 3 in this cover letter")).toBeVisible();
});

test("notes autosave to the project; the job description opens to the full ad (AC2)", async ({ page }) => {
  test.setTimeout(60_000);
  const { id } = await makeProject(page, job);
  await page.goto(`/projects/${id}`);
  const notes = panel(page).getByRole("textbox", { name: "Your notes" });
  await notes.fill("Referred by Dana.");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(notes).toHaveValue("Referred by Dana.");
  await panel(page).getByRole("button", { name: "Job description" }).click();
  await expect(panel(page).locator("pre")).toHaveText(job.jdText);
});

test("Regenerate: Cancel makes no call; confirming makes one, keeps the theme, adds revisions and can be undone (AC3)", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => ((window as { __llmCalls?: string[] }).__llmCalls = [])); // the mock adapter's spy
  const { id } = await makeProject(page, job);
  await page.goto(`/projects/${id}`);
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByRole("tab", { name: "Design" }).click();
  await inspector.getByRole("button", { name: "Accent #1F4E8C" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

  const open = panel(page).getByRole("button", { name: "Regenerate both documents" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Regenerate both documents?" });
  await expect(dialog).toContainText("using about 7,500 tokens on your model."); // no connection here: the mock adapter answers
  await expect(dialog).toContainText("Your current versions stay in history, so you can restore them.");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => (window as { __llmCalls?: string[] }).__llmCalls)).toEqual([]);

  await open.click();
  await dialog.getByRole("button", { name: "Regenerate" }).click();
  await expect(page.getByText("Both documents regenerated")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => (window as { __llmCalls?: string[] }).__llmCalls)).toEqual(["generate"]);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

  const { documents } = await (await page.request.get(`/api/projects/${id}`)).json();
  const resume = documents.find((d: { kind: string }) => d.kind === "resume");
  expect(resume.theme.accent).toBe("#1F4E8C");
  expect(resume.sections.find((s: { kind: string }) => s.kind === "summary").text).not.toBe(SUMMARY);
  for (const d of documents) {
    const revs = await (await page.request.get(`/api/documents/${d.id}/revisions`)).json();
    expect(JSON.stringify(revs)).toContain("Regenerated from job brief");
  }

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Undid: Regenerated from job brief")).toBeVisible();
  await inspector.getByRole("tab", { name: "Content" }).click();
  await expect(inspector.getByRole("button", { name: /Summary/ })).toContainText(SUMMARY);
});

test("the preview bar toggles the job panel (AC4)", async ({ page }) => {
  const { id, role } = await makeProject(page, job);
  await page.goto(`/projects/${id}`);
  const heading = panel(page).getByRole("heading", { name: role });
  await expect(heading).toBeVisible();
  await toggle(page).click();
  await expect(heading).toBeHidden();
  await toggle(page).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Show or hide the job panel");
  await toggle(page).click();
  await expect(heading).toBeVisible();
});

test("below 1180px wide the job panel starts closed and the toggle opens it (AC4)", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  const { id, role } = await makeProject(page, job);
  await page.goto(`/projects/${id}`);
  await expect(page.getByRole("tab", { name: "Resume" })).toBeVisible();
  const heading = page.getByRole("heading", { name: role });
  await expect(heading).toBeHidden();
  await toggle(page).click();
  await expect(heading).toBeVisible();
});

test("a failed regeneration shows the error callout, unlocks editing, and Try again recovers (AC3)", async ({ page }) => {
  test.setTimeout(60_000);
  const { id } = await makeProject(page, job);
  await page.goto(`/projects/${id}?mock=generate-error`);
  await panel(page).getByRole("button", { name: "Regenerate both documents" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Regenerate" }).click();
  const alert = panel(page).getByRole("alert");
  await expect(alert).toContainText("Anthropic is having trouble right now", { timeout: 15_000 });
  await expect(panel(page).getByRole("button", { name: "Regenerate both documents" })).toBeEnabled();
  await expect(page.getByRole("complementary", { name: "Inspector" }).getByRole("button", { name: /Summary/ })).toBeEnabled();
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Both documents regenerated")).toBeVisible({ timeout: 15_000 });
  await expect(alert).toBeHidden();
});
