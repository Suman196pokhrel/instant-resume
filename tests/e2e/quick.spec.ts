import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PROVIDERS } from "../../lib/llm/providers";

// SPEC §14.3 Quick generate: input, the five-stage pipeline and its live results, Cancel, and Retry (TASK-24).
const MINTLEAF = readFileSync(join(__dirname, "../fixtures/jds/mintleaf.txt"), "utf8");
const stage = (page: Page, label: string | RegExp) => page.getByRole("list", { name: "Stages" }).getByRole("listitem").filter({ hasText: label });

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
const projectPosts = (page: Page) => {
  const posts: string[] = [];
  page.on("request", (r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/projects" && posts.push(r.url()));
  return posts;
};

test("Generate waits for a key and text; a short ad asks for the whole thing (input)", async ({ page }) => {
  await page.goto("/new/quick");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paste a job description");
  await expect(page.getByText("No API key connected.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toBeDisabled();
  await connectAnthropic(page);
  await page.goto("/new/quick");
  await expect(page.getByRole("button", { name: "Generate" })).toBeDisabled();
  await page.getByLabel("Job description").fill("Engineer wanted.");
  await expect(page.getByText("16 characters")).toBeVisible();
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText("That looks too short to be a full job description. Paste the whole ad, including the requirements.")).toBeVisible();
  await expect(page.getByText(/Defaults: Classic theme, 2 pages, cover letter on \(professional tone\)\./)).toBeVisible();
});

test("the five stages run with live results, a monotonic bar and announcements, then open the project (AC1, AC2)", async ({ page }) => {
  test.setTimeout(90_000);
  await connectAnthropic(page);
  await page.goto("/new/quick");
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByLabel(/Notes for this application/).fill("Referred by Dana Okafor");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Generating your documents");
  await expect(page.getByText("Results appear here as each step finishes.")).toBeVisible();
  await expect(stage(page, "Reading the job description")).toHaveAttribute("data-state", "active");
  await expect(stage(page, "Matching your experience")).toContainText("Not started");
  const seen: number[] = [];
  const bar = page.getByRole("progressbar", { name: "Overall progress" });
  const sample = setInterval(() => void bar.getAttribute("aria-valuenow").then((v) => v && seen.push(+v)).catch(() => {}), 150);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Generating for Senior Full Stack Engineer at Mintleaf", { timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Job brief" })).toContainText("Must-haves");
  await expect(stage(page, "Reading the job description")).toContainText(/\d+ must-haves, \d+ keywords/);
  await expect(page.getByRole("region", { name: "Matched from your knowledge base" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Job brief" }).getByText("Matched:").first()).toBeAttached();
  await expect(page.getByRole("region", { name: "Draft" })).toContainText("Jordan Whitlock", { timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Page fit" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("status").filter({ hasText: /Fitting to 2 pages|Running checks|Your documents are ready/ })).toBeAttached();
  await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30_000 });
  clearInterval(sample);
  expect(seen.length).toBeGreaterThan(3);
  expect(seen).toEqual([...seen].sort((a, b) => a - b)); // the bar never moves back
  await expect(page.getByText("Senior Full Stack Engineer at Mintleaf")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Job and checks" }).getByRole("textbox", { name: "Your notes" })).toHaveValue("Referred by Dana Okafor");
});

test("Cancel stops the run, keeps the text and creates no project (AC3)", async ({ page }) => {
  test.setTimeout(60_000);
  await connectAnthropic(page);
  const posts = projectPosts(page);
  await page.goto("/new/quick");
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(stage(page, /Writing your resume/)).toHaveAttribute("data-state", "active", { timeout: 20_000 });
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Generation cancelled. Your job description is still here.")).toBeVisible();
  await expect(page.getByLabel("Job description")).toHaveValue(MINTLEAF);
  await page.waitForTimeout(3000); // the cancelled call would have finished by now
  expect(posts).toEqual([]);
  await expect(page).toHaveURL(/\/new\/quick$/);
});

test("an error stops at its stage; Retry from this step completes, and Start over keeps the text (AC4)", async ({ page }) => {
  test.setTimeout(90_000);
  await connectAnthropic(page);
  await page.goto("/new/quick?mock=error-stage-4");
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByRole("button", { name: "Generate" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Stopped at" });
  await expect(alert).toContainText('Stopped at "Fitting to 2 pages"', { timeout: 30_000 });
  await expect(alert).toContainText("The renderer stopped while laying out page 2. The steps before this one are kept.");
  await expect(stage(page, "Fitting to 2 pages")).toHaveAttribute("data-state", "error");
  await expect(stage(page, "Writing your resume and cover letter")).toHaveAttribute("data-state", "done");
  await expect(alert.getByRole("button", { name: "Retry from this step" })).toBeFocused();

  await alert.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByLabel("Job description")).toHaveValue(MINTLEAF);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(alert).toBeVisible({ timeout: 30_000 }); // a fresh run fails once again
  await alert.getByRole("button", { name: "Retry from this step" }).click();
  await expect(stage(page, "Writing your resume and cover letter")).toHaveAttribute("data-state", "done"); // kept, not rerun
  await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30_000 });
});
