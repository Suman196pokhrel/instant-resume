import { expect, test, type Page } from "@playwright/test";
import fixture from "../fixtures/kb.json";
import { PROVIDERS } from "../../lib/llm/providers";
import { makeProject } from "./projects";
import { runOnEmptyServer } from "./server";

// SPEC §13.1 setup checklist, §18.4 #13 (TASK-29 AC1), on a fresh install.
runOnEmptyServer(3107);

const checklist = (page: Page) => page.getByRole("region", { name: "Get set up" });
const origin = (page: Page) => ({ origin: new URL(page.url()).origin }); // this file's own server

async function connectKey(page: Page) {
  const body = { data: PROVIDERS.flatMap((p) => p.models).map((id) => ({ id })) };
  await page.route(/api\.anthropic\.com/, (route) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) }));
  await page.goto("/settings");
  const card = page.locator("[data-provider=anthropic]");
  await card.getByLabel("API key").fill("sk-ant-api03-test-key-0123456789a9F2");
  await card.getByRole("button", { name: "Test and save" }).click();
  await expect(page.getByText("Anthropic connected")).toBeVisible();
}

async function saveBackground(page: Page) {
  const state = { step: 10, maxStep: 10, draft: fixture, completed: false, saveMode: "replace" };
  const put = await page.request.put("/api/onboarding", { headers: origin(page), data: state });
  expect(put.ok(), await put.text()).toBe(true);
  expect((await page.request.post("/api/onboarding/complete", { headers: origin(page), data: { mode: "replace" } })).ok()).toBe(true);
}

test("the checklist ticks each step, can be dismissed, and goes at 3 of 3 (AC1)", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(checklist(page)).toContainText("0 of 3 done");
  await expect(checklist(page).getByRole("link", { name: "Add a key" })).toHaveAttribute("data-variant", "primary");
  await expect(checklist(page).getByRole("link", { name: "Import resume" })).toHaveAttribute("data-variant", "ghost");
  await expect(checklist(page).getByRole("link", { name: "or enter it manually" })).toHaveAttribute("href", "/onboarding");

  await connectKey(page);
  await page.goto("/dashboard");
  await expect(checklist(page)).toContainText("1 of 3 done");
  await expect(checklist(page).getByRole("listitem").first()).toContainText("(done)");
  await expect(checklist(page).getByRole("link", { name: "Add a key" })).toHaveCount(0);
  await expect(checklist(page).getByRole("link", { name: "Import resume" })).toHaveAttribute("data-variant", "primary");

  await saveBackground(page);
  await page.reload();
  await expect(checklist(page)).toContainText("2 of 3 done");

  await checklist(page).getByRole("button", { name: "Dismiss setup checklist" }).click();
  await expect(checklist(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
  await expect(checklist(page)).toHaveCount(0); // stays dismissed

  const prefs = await (await page.request.get("/api/settings")).json();
  await page.request.put("/api/settings", { headers: origin(page), data: { ...prefs, dismissedOnboardingBanner: false } });
  await makeProject(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
  await expect(checklist(page)).toHaveCount(0); // 3 of 3: done
});

// TASK-51 AC2, on this file's own database (the shared one must keep the defaults): Quick generate reads the saved defaults.
test("Quick generate shows the saved defaults, and drops the cover letter from its promise when it's off", async ({ page }) => {
  await page.goto("/settings");
  const prefs = await (await page.request.get("/api/settings")).json();
  const put = await page.request.put("/api/settings", { headers: origin(page), data: { ...prefs, quick: { theme: "modern", pages: 1, coverLetter: false, tone: "Warm" } } });
  expect(put.ok()).toBe(true);
  await page.goto("/new/quick");
  await expect(page.getByText("Defaults: Modern theme, 1 page, cover letter off.")).toBeVisible();
  await expect(page.getByText("You'll get a tailored resume, written only from facts in your knowledge base.")).toBeVisible();
});

// Owner's bug: Add evidence could only add to an existing entry. It writes the KB, so it runs on this file's server.
test("Add evidence can create a new role for the fact, with its details required", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/dashboard");
  const { id } = await makeProject(page, { keywords: ["Elixir"], requirements: ["Elixir in production"] });
  await page.goto(`/projects/${id}`);
  const panel = page.getByRole("complementary", { name: "Job and checks" });
  await panel.getByRole("tab", { name: /Checks/ }).click();
  await panel.getByRole("button", { name: "Add Elixir" }).click();
  const dialog = page.getByRole("dialog", { name: "Add to your knowledge base" });
  await expect(dialog).toContainText("Only add what's true. Future resumes can use it.");
  await dialog.getByLabel("Add it to").selectOption({ label: "New role…" });
  await dialog.getByRole("button", { name: "Save to knowledge base" }).click();
  await expect(dialog.getByText("Enter the job title")).toBeVisible();
  await expect(dialog.getByLabel("Job title")).toBeFocused();
  await dialog.getByLabel("Job title").fill("Backend Developer");
  await dialog.getByLabel("Employer").fill("Harbour Queue Co");
  await dialog.getByLabel("Start").fill("Jan 2021");
  await dialog.getByLabel("End").fill("Dec 2021");
  await dialog.getByLabel("What you did and the result").fill("Ran the Elixir job queue in production");
  await dialog.getByRole("button", { name: "Save to knowledge base" }).click();
  await expect(page.getByText("Added to Backend Developer, Harbour Queue Co")).toBeVisible();
  const kb = await (await page.request.get("/api/kb")).json();
  const role = kb.roles.find((r: { company: string }) => r.company === "Harbour Queue Co");
  expect(role).toMatchObject({ title: "Backend Developer", start: "Jan 2021", end: "Dec 2021", highlights: [{ text: "Ran the Elixir job queue in production", skills: ["Elixir"], evidenceFor: "Elixir" }] });
});
