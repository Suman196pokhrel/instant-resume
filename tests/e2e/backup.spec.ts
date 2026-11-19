import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// SPEC §14.6, §18.4 #11 (TASK-27). The real round trip is tests/api/backup.test.ts: importing here would replace the
// shared e2e database under the other tests, so the import is stubbed.
test("Export backup downloads the dated file with everything but the keys (AC1, AC2)", async ({ page }) => {
  await page.goto("/settings");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Your data" }) });
  const [download] = await Promise.all([page.waitForEvent("download"), section.getByRole("button", { name: "Export backup" }).click()]);
  const name = `instant-resume-backup-${new Date().toISOString().slice(0, 10)}.json`;
  expect(download.suggestedFilename()).toBe(name);
  await expect(page.getByText(`Exported ${name}`)).toBeVisible();
  const data = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(data).toMatchObject({ app: "instant-resume", knowledgeBase: { contact: { name: "Jordan Whitlock" } } });
  expect(JSON.stringify(data)).not.toMatch(/"(connections|key|apiKey)":/);
});

test("Import backup restores from a file; a file that isn't a backup says so (AC3)", async ({ page }) => {
  let posted = "";
  await page.route("/api/backup", (route) =>
    route.request().method() === "POST" ? ((posted = route.request().postData() ?? ""), route.fulfill({ json: { projects: 3 } })) : route.continue()
  );
  await page.goto("/kb/roles");
  const backup = { app: "instant-resume", schemaVersion: 1 };
  await page.locator('input[type="file"]').setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText("Imported your knowledge base and 3 applications")).toBeVisible();
  expect(JSON.parse(posted)).toEqual(backup);

  await page.unroute("/api/backup");
  await page.route("/api/backup", (route) => route.fulfill({ status: 422, json: { error: "invalid" } }));
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByText("Import failed: this file isn't a Instant Resume backup")).toBeVisible();
});

test("the Knowledge base top bar has Import resume, Import backup and Export backup, in that order", async ({ page }) => {
  await page.goto("/kb/roles");
  await expect(page.locator("header")).toContainText(/Import resume.*Import backup.*Export backup/);
});
