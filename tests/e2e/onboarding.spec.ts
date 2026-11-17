import { spawn, type ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// SPEC §14.1 manual onboarding and §18.4 #1 (first run). Runs on its own server with an empty database (the shared
// e2e server is seeded), using the production build the Playwright web server made.
const PORT = 3103;
const DB = join(tmpdir(), "ir-e2e-onboarding.db");
let server: ChildProcess;

test.describe.configure({ mode: "serial" });
test.use({ baseURL: `http://127.0.0.1:${PORT}` });

test.beforeAll(async () => {
  test.setTimeout(60_000);
  rmSync(DB, { force: true });
  server = spawn("pnpm", ["start"], { env: { ...process.env, PORT: String(PORT), IR_DB_URL: `file:${DB}`, IR_DEV_UI: "1" }, detached: true, stdio: "ignore" });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`http://127.0.0.1:${PORT}/api/settings`).then((r) => r.ok, () => false)) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("onboarding test server did not start");
});

test.afterAll(() => {
  if (server?.pid) process.kill(-server.pid, "SIGTERM"); // the whole group: pnpm and next-server
});

const progress = (page: Page) => page.getByRole("progressbar", { name: "Onboarding progress" });
const cont = (page: Page) => page.getByRole("button", { name: "Save and continue" });

test("an empty database opens onboarding, which offers import or manual entry (AC1)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Build your knowledge base");
  await expect(page.getByRole("link", { name: /Import an existing resume/ })).toHaveAttribute("href", "/import");
  await page.getByRole("link", { name: /Enter details manually/ }).click();
  await expect(page).toHaveURL(/\/onboarding\/manual$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact details");
});

test("shows the step and steps left, and lists all 11 steps (AC2)", async ({ page }) => {
  await page.goto("/onboarding/manual");
  await expect(progress(page)).toContainText("Step 1 of 11");
  await expect(progress(page)).toContainText("10 steps left");
  const rail = page.getByRole("navigation", { name: "Onboarding steps" });
  await expect(rail.getByRole("button")).toHaveCount(11);
  await expect(rail.getByRole("button", { name: /Work rights/ })).toBeDisabled(); // not reached yet
});

test("required fields show errors and focus; only optional steps can be skipped (AC3)", async ({ page }) => {
  await page.goto("/onboarding/manual");
  await expect(page.getByRole("button", { name: "Skip this step" })).toHaveCount(0);
  await cont(page).click();
  await expect(page.getByText("Enter your full name")).toBeVisible();
  await expect(page.getByText("Enter your email")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await page.getByLabel("Full name").fill("Riley Ng");
  await page.getByLabel("Email").fill("riley@example");
  await page.getByLabel("Location").fill("Hobart TAS");
  await cont(page).click();
  await expect(page.getByText("Enter an email like name@example.com")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeFocused();
  await page.getByLabel("Email").fill("riley@example.com");
  await cont(page).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Work rights");
  await expect(page.getByRole("status").getByText("Saved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip this step" })).toBeVisible();
});

test("progress is saved: a reload and /onboarding resume at the same step (AC4)", async ({ page }) => {
  await page.goto("/onboarding/manual");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Work rights");
  await expect(page.getByText("Picked up where you left off: Work rights")).toBeVisible();
  await expect(progress(page)).toContainText("Step 2 of 11");
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/onboarding\/manual$/);
  // Back to Contact: the saved details are still there.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("Riley Ng");
  await cont(page).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Work rights");
});

test("a volunteer-only background reaches Review and saves to the knowledge base (AC5)", async ({ page }) => {
  await page.goto("/onboarding/manual");
  await page.getByRole("button", { name: "Skip this step" }).click(); // work rights
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Experience");
  await page.getByRole("button", { name: "Skip this step" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Volunteer work");
  await expect(page.getByText("Add your first volunteer role")).toBeVisible();
  // An incomplete entry is not saved on Continue.
  await page.getByLabel("Job title").fill("Mentor");
  await cont(page).click();
  await expect(page.getByText("Enter your organisation")).toBeVisible();
  await page.getByLabel("Organisation").fill("Code Club Australia");
  await page.getByLabel("Highlight 1", { exact: true }).fill("Ran weekly coding sessions for 20 students");
  await page.getByRole("button", { name: "Save volunteer role" }).click();
  await expect(page.getByText("Add another volunteer role")).toBeVisible();
  await expect(page.getByText("1 highlight", { exact: true })).toBeVisible();
  await cont(page).click();
  for (const title of ["Portfolio items", "Education", "Skills", "Achievements and publications", "Referees", "Additional sections"]) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await page.getByRole("button", { name: "Skip this step" }).click();
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Review");
  await expect(progress(page)).toContainText("Last step");
  await expect(page.getByRole("button", { name: "Skip this step" })).toHaveCount(0);
  await expect(page.getByText("Mentor")).toBeVisible();
  await expect(page.getByText("1 added")).toBeVisible();
  await expect(page.getByLabel("Save behaviour")).toHaveCount(0); // nothing to merge into yet

  await page.getByRole("button", { name: "Save to knowledge base" }).click();
  await expect(page.getByRole("heading", { name: "Your knowledge base is ready" })).toBeFocused();
  await expect(page.getByText("2 entries saved.")).toBeVisible();

  await page.goto("/kb/volunteering");
  await expect(page.getByRole("heading", { name: "Mentor" })).toBeVisible();
  await expect(page.getByText("Ran weekly coding sessions for 20 students")).toBeVisible();
  await page.goto("/kb/workRights");
  await expect(page.getByText("Not set").first()).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("after finishing, /onboarding is the chooser again, and Fill with sample works in development", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Build your knowledge base"); // finished: the chooser again
  await page.goto("/onboarding/manual");
  await page.getByRole("button", { name: "Fill with sample" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("Jordan Whitlock");
  await cont(page).click();
  await page.getByRole("navigation", { name: "Onboarding steps" }).getByRole("button", { name: /Work rights/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Work rights");
});
