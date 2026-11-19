import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PROVIDERS } from "../../lib/llm/providers";
import { unique } from "./projects";

// SPEC §14.3 Quick generate: input, the five-stage pipeline and its live results, Cancel, Retry (TASK-24), and the
// result screen with downloads, gaps and Regenerate (TASK-26).
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
  await expect(page.getByText(/Defaults: Classic theme, 1 page, cover letter on \(professional tone\)\./)).toBeVisible();
});

test("the five stages run with live results, a monotonic bar and announcements, then open the project (AC1, AC2)", async ({ page }) => {
  test.setTimeout(90_000);
  await connectAnthropic(page);
  await page.goto("/new/quick");
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByLabel(/Notes for this application/).fill("Referred by Dana Okafor");
  // A fast run replaces the progress screen before a poll could see its last cards, so record each card as it appears.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { seenCards: string[] }).seenCards = seen;
    new MutationObserver(() => document.querySelectorAll("section[aria-label]").forEach((s) => seen.includes(s.ariaLabel!) || seen.push(s.ariaLabel!))).observe(document.body, { childList: true, subtree: true });
  });
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
  await expect(page.getByRole("status").filter({ hasText: /Fitting to 1 page|Running checks|Your documents are ready/ })).toBeAttached();
  await expect(page.getByRole("heading", { level: 1, name: "Your documents are ready" })).toBeFocused({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { seenCards: string[] }).seenCards)).toEqual(expect.arrayContaining(["Job brief", "Matched from your knowledge base", "Draft", "Page fit", "Checks"]));
  clearInterval(sample);
  expect(seen.length).toBeGreaterThan(3);
  expect(seen).toEqual([...seen].sort((a, b) => a - b)); // the bar never moves back
  await page.getByRole("link", { name: "Open in Studio" }).click();
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
  await expect(alert).toContainText('Stopped at "Fitting to 1 page"', { timeout: 30_000 });
  await expect(alert).toContainText("The renderer stopped while laying out page 2. The steps before this one are kept.");
  await expect(stage(page, "Fitting to 1 page")).toHaveAttribute("data-state", "error");
  await expect(stage(page, "Writing your resume and cover letter")).toHaveAttribute("data-state", "done");
  await expect(alert.getByRole("button", { name: "Retry from this step" })).toBeFocused();

  await alert.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByLabel("Job description")).toHaveValue(MINTLEAF);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(alert).toBeVisible({ timeout: 30_000 }); // a fresh run fails once again
  await alert.getByRole("button", { name: "Retry from this step" }).click();
  await expect(stage(page, "Writing your resume and cover letter")).toHaveAttribute("data-state", "done"); // kept, not rerun
  await expect(page.getByRole("heading", { level: 1, name: "Your documents are ready" })).toBeVisible({ timeout: 30_000 });
});

const origin = () => ({ origin: new URL(test.info().project.use.baseURL!).origin });
const result = (page: Page) => page.getByRole("heading", { level: 1, name: "Your documents are ready" });
async function generate(page: Page, scenario = "happy") {
  await page.goto(`/new/quick?mock=${scenario}`);
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(result(page)).toBeFocused({ timeout: 45_000 });
  return (await page.getByRole("link", { name: "Open in Studio" }).getAttribute("href"))!.split("/").pop()!;
}

test("the result shows thumbnails, tiles and the issues; Download both saves 2 files; Regenerate replaces the project (AC1, AC2)", async ({ page }) => {
  test.setTimeout(120_000);
  await connectAnthropic(page);
  const first = await generate(page, "gaps");
  await expect(page.getByText(/^Senior Full Stack Engineer at Mintleaf\. Generated in \d+\.\ds with claude-sonnet-5-5\.$/)).toBeVisible();
  await expect(page.getByText(/^\d+% keyword coverage$/)).toBeVisible();
  await expect(page.getByText("2 gaps", { exact: true })).toBeVisible();
  await expect(page.getByText(/^\d+ findings?$/)).toBeVisible();
  const figures = page.getByRole("figure");
  await expect(figures).toHaveCount(2);
  await expect(figures.nth(0)).toContainText("Jordan-Whitlock-Resume-Mintleaf.pdf");
  await expect(figures.nth(1)).toContainText("Jordan-Whitlock-Cover-Letter-Mintleaf.pdf");
  await expect(figures.nth(0).getByText(/^\d+ pages?$/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /items? to review before you send/ })).toContainText("Downloads aren't blocked");
  const items = page.getByRole("list", { name: "Items to review" }).getByRole("listitem");
  await expect(items.filter({ hasText: "Gap" })).toHaveCount(2);

  const files: string[] = [];
  page.on("download", (d) => files.push(d.suggestedFilename()));
  await page.getByRole("button", { name: "Download both" }).click();
  await expect(page.getByText("Downloaded Jordan-Whitlock-Resume-Mintleaf.pdf and Jordan-Whitlock-Cover-Letter-Mintleaf.pdf")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => files).toEqual(["Jordan-Whitlock-Resume-Mintleaf.pdf", "Jordan-Whitlock-Cover-Letter-Mintleaf.pdf"]); // gaps don't block

  await page.getByRole("button", { name: "Regenerate" }).first().click();
  await expect(result(page)).toBeFocused({ timeout: 45_000 });
  const second = (await page.getByRole("link", { name: "Open in Studio" }).getAttribute("href"))!.split("/").pop()!;
  expect(second).not.toBe(first);
  await expect.poll(async () => (await page.request.get(`/api/projects/${first}`)).status()).toBe(404); // replaced
});

test("Add to knowledge base on a gap rejects an empty fact, saves a real one, and Regenerate uses it as a sourced bullet (AC3)", async ({ page }) => {
  test.setTimeout(120_000);
  // Its own portfolio item and the Payments gap: kb.spec counts the seed's roles and studio.spec needs Kubernetes unbacked, in parallel
  const name = unique("Quick Test Project");
  const made = await page.request.post("/api/kb/portfolio", { headers: origin(), data: { name, summary: "A test project", highlights: [] } });
  expect(made.status()).toBe(201);
  const entry = await made.json();
  try {
    await connectAnthropic(page);
    await generate(page, "gaps");
    const row = page.getByRole("list", { name: "Items to review" }).getByRole("listitem").filter({ hasText: "Payments or financial services experience" });
    await row.getByRole("button", { name: "Add to knowledge base" }).click();
    const dialog = page.getByRole("dialog", { name: "Add to your knowledge base" });
    await expect(dialog).toContainText("The job asks for Payments or financial services experience.");
    await dialog.getByLabel("Add it to").selectOption({ label: name });
    await dialog.getByRole("button", { name: "Save to knowledge base" }).click();
    await expect(dialog.getByText("Describe what you did")).toBeVisible();
    await dialog.getByLabel("What you did and the result").fill("Built card Payments reconciliation for a small lender");
    await dialog.getByRole("button", { name: "Save to knowledge base" }).click();
    await expect(page.getByText(`Added to ${name}`)).toBeVisible();
    await expect(row).toContainText("Added");
    await expect(row).toContainText(`Saved to ${name}. Regenerate to use it.`);
    await expect(row.getByRole("button", { name: "Regenerate" })).toBeFocused();

    await row.getByRole("button", { name: "Regenerate" }).click();
    await expect(result(page)).toBeFocused({ timeout: 45_000 });
    await expect(page.getByText("1 gap", { exact: true })).toBeVisible();
    const id = (await page.getByRole("link", { name: "Open in Studio" }).getAttribute("href"))!.split("/").pop()!;
    const kb = await (await page.request.get("/api/kb")).json();
    const highlight = kb.portfolio.find((r: { id: string }) => r.id === entry.id).highlights[0];
    expect(highlight).toMatchObject({ evidenceFor: "Payments or financial services experience" });
    const { documents } = await (await page.request.get(`/api/projects/${id}`)).json();
    expect(JSON.stringify(documents.find((d: { kind: string }) => d.kind === "resume").sections)).toContain(`"source":"${highlight.id}"`);
  } finally {
    await page.request.delete(`/api/kb/portfolio/${entry.id}`, { headers: origin() });
  }
});
