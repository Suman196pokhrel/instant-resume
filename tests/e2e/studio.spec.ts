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
  // Dev only (TASK-52): a sample ad chip fills the text.
  await page.getByRole("button", { name: "Tessellate Health, Full Stack Engineer" }).click();
  await expect(page.getByLabel("Job description")).toHaveValue(/^Full Stack Engineer\nTessellate Health/);
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
  const brightwater = page.getByRole("checkbox", { name: /Software Engineer, Brightwater Logistics/ }).first(); // kb.spec renames it to "Lead …" in parallel
  await expect(brightwater).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Ledgerline/ }).first()).not.toBeChecked();
  await expect(page.getByText(/Matches React, TypeScript/).first()).toBeVisible();
  await expect(page.getByText("Runs on claude-sonnet-5-5, about 7,500 tokens")).toBeVisible();

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

// SPEC §14.4 step 4 (TASK-43): one generate call, a compile check, then the project is saved and opened.
async function toEntries(page: Page, query = "") {
  await connectAnthropic(page);
  await page.goto(`/new/studio${query}`);
  await page.getByLabel("Job description").fill(MINTLEAF);
  await page.getByRole("button", { name: /Notes for this application/ }).click();
  await page.getByRole("textbox", { name: "Notes for this application" }).fill("Referred by Dana Okafor");
  await page.getByRole("button", { name: "Extract requirements" }).click();
  await page.getByRole("button", { name: "Choose entries" }).click();
  await expect(h1(page)).toHaveText("Choose what to draw on");
}
/** This page's project saves (the shared e2e server gets projects from parallel tests too). */
function saves(page: Page) {
  const posts: string[] = [];
  page.on("request", (r) => r.method() === "POST" && r.url().endsWith("/api/projects") && posts.push(r.url()));
  return posts;
}

test("Generate saves the project with notes, brief and selection, then opens it (AC1-AC3)", async ({ page }) => {
  test.setTimeout(90_000);
  await toEntries(page);
  const posts = saves(page);
  await page.route("**/api/projects", async (route) => {
    await new Promise((r) => setTimeout(r, 1500)); // hold the save so the finished stages can be read
    await route.continue();
  });
  await page.getByRole("button", { name: "Generate resume and cover letter" }).focus();
  await page.keyboard.press("Enter");
  await expect(h1(page)).toHaveText("Generating for Mintleaf");
  await expect(h1(page)).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Drafting the resume and cover letter…" })).toBeAttached();
  await expect(page.getByText("Using claude-sonnet-5-5. Only facts from the entries you chose can be used.")).toBeVisible();
  const stages = page.getByRole("list", { name: "Generation stages" }).getByRole("listitem");
  await expect(stages).toHaveText([/^Matching knowledge base entries to the brief\s*on device/, /^Drafting the resume and cover letter/, /^Validating the response\s*on device/, /^Running checks\s*on device/, /^Rendering the PDF preview\s*on device/]);
  await expect(stages.nth(1)).toHaveAttribute("data-state", "active");
  await expect(page.getByText(/^\d+\.\ds elapsed$/)).toBeVisible();
  await expect(page.locator("[data-ghost] > *").first()).toBeVisible(); // the ghost page grows while drafting
  await expect(stages.nth(2)).toContainText(/\d+ operations, all valid/, { timeout: 15_000 });

  await page.waitForURL(/\/projects\/p-/, { timeout: 60_000 });
  await expect(page.getByText(/^Generated in \d+(\.\d)?s\. Review the checks before you export\.$/)).toBeVisible();
  const id = page.url().split("/").pop();
  await page.goBack(); // Back never starts a second, paid generation
  await expect(h1(page)).toHaveText("Paste the job description");
  expect(posts).toHaveLength(1);
  const { project, documents } = await (await page.request.get(`/api/projects/${id}`)).json();
  expect(project).toMatchObject({ company: "Mintleaf", role: "Senior Full Stack Engineer", source: "studio", notes: "Referred by Dana Okafor", jdText: MINTLEAF });
  expect(project.brief.keywords).toContain("React");
  expect(project.selected).toContain("role-brightwater");
  const resume = documents.find((d: { kind: string }) => d.kind === "resume");
  const letter = documents.find((d: { kind: string }) => d.kind === "coverLetter");
  const bullets = resume.sections.flatMap((s: { items?: { bullets?: { source: string }[] }[] }) => s.items?.flatMap((i) => i.bullets ?? []) ?? []);
  expect(bullets.length).toBeGreaterThan(0);
  expect(bullets.every((b: { source: string }) => b.source.startsWith("hl-"))).toBe(true);
  expect(letter.sections.map((s: { title: string }) => s.title)).toEqual(["Opening", "Evidence", "Fit", "Close"]);

  await page.goto("/new/studio"); // the draft was cleared once the project saved
  await expect(h1(page)).toHaveText("Paste the job description");
  await expect(page.getByLabel("Job description")).toHaveValue("");
});

test("a failed generation saves nothing; Switch model opens the picker and Try again recovers (AC3, DoD)", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toEntries(page, "?mock=generate-error");
  const posts = saves(page);
  await page.getByRole("button", { name: "Generate resume and cover letter" }).click();
  await expect(page.locator("[data-ghost] > *").first()).toHaveCSS("animation-duration", "1e-05s"); // static under reduced motion
  const alert = page.getByRole("main").getByRole("alert").filter({ hasText: "Generation stopped" });
  await expect(alert).toContainText("Generation stopped while drafting the resume and cover letter.");
  await expect(alert).toContainText("Nothing was saved, and your job description, brief and selections are kept.");
  await expect(alert).toContainText("Anthropic is having trouble right now");
  await expect(page.locator(":focus")).toContainText("Generation stopped"); // focus moves to the failure
  await page.keyboard.press("Tab");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeFocused();
  await expect(page.getByRole("list", { name: "Generation stages" }).getByRole("listitem").nth(1)).toHaveAttribute("data-state", "failed");
  expect(posts).toHaveLength(0);

  await alert.getByRole("button", { name: "Switch model" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await alert.getByRole("button", { name: "Back to entries" }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/projects\/p-/, { timeout: 60_000 });
  expect(posts).toHaveLength(1);
});

test("Back to entries after a failure keeps the selection (AC3)", async ({ page }) => {
  await toEntries(page, "?mock=generate-error");
  const picked = await page.getByText(/^\d+ of \d+ selected$/).textContent();
  await page.getByRole("button", { name: "Generate resume and cover letter" }).click();
  await page.getByRole("button", { name: "Back to entries" }).click();
  await expect(h1(page)).toHaveText("Choose what to draw on");
  await expect(page.getByText(/^\d+ of \d+ selected$/)).toHaveText(picked!);
});
