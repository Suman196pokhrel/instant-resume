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
