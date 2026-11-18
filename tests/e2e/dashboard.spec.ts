import { expect, test, type Page } from "@playwright/test";
import { makeProject, unique } from "./projects";

// SPEC §13.1 Applications dashboard (TASK-14), on the shared seeded server: each test makes its own project with a
// unique role, because other files add projects in parallel.
async function make(page: Page, role: string, company = "Southerly Energy") {
  return (await makeProject(page, { role, company })).id;
}
const card = (page: Page, role: string) => page.getByRole("article").filter({ has: page.getByRole("link", { name: role, exact: true }) });

test("a card shows role, company, location and when it was edited, and opens the Workspace (AC1)", async ({ page }) => {
  const role = unique("Platform Engineer");
  const id = await make(page, role);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Applications");
  await expect(page.getByText("One job description, a tailored resume and a cover letter. Everything saves automatically.")).toBeVisible();
  const c = card(page, role);
  await expect(c).toContainText("Southerly Energy");
  await expect(c).toContainText("Sydney NSW");
  await expect(c).toContainText("Edited just now");
  await expect(c.getByText("S", { exact: true })).toBeVisible(); // monogram
  await expect(page.getByRole("link", { name: "New application" }).first()).toHaveAttribute("href", "/new");
  await c.click({ position: { x: 20, y: 90 } }); // anywhere on the card
  await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
});

test("search filters cards live by company or role (AC4)", async ({ page }) => {
  const role = unique("Data Engineer");
  const company = unique("Kestrel Analytics");
  await make(page, role, company);
  await page.goto("/dashboard");
  const search = page.getByRole("searchbox", { name: "Search applications" });
  await search.fill(company.toLowerCase());
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(card(page, role)).toBeVisible();
  await search.fill(role.split(" ").pop()!);
  await expect(page.getByRole("article")).toHaveCount(1);
  await search.fill("zzz-nothing-matches");
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByText("No matching applications.")).toBeVisible();
});

test("Duplicate adds a copy from the card menu, using the keyboard (AC4, DoD)", async ({ page }) => {
  const role = unique("Site Reliability Engineer");
  await make(page, role);
  await page.goto("/dashboard");
  await card(page, role).getByRole("button", { name: "More for Southerly Energy" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Open" })).toBeFocused(); // a keyboard open highlights the first item
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(card(page, `${role} (copy)`)).toBeVisible();
});

test("Delete hides the card with an Undo toast; Undo keeps it, and without Undo it is deleted (AC3)", async ({ page }) => {
  test.setTimeout(30_000);
  const keep = unique("Backend Engineer");
  const drop = unique("Frontend Engineer");
  const keepId = await make(page, keep);
  const dropId = await make(page, drop);
  await page.goto("/dashboard");

  const remove = async (role: string) => {
    await card(page, role).getByRole("button", { name: "More for Southerly Energy" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(card(page, role)).toHaveCount(0);
  };
  await remove(keep);
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Application deleted" });
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(card(page, keep)).toBeVisible();

  await remove(drop);
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Application deleted" }).first()).toBeVisible();
  await expect.poll(async () => (await page.request.get(`/api/projects/${dropId}`)).status(), { timeout: 15_000 }).toBe(404);
  expect((await page.request.get(`/api/projects/${keepId}`)).status()).toBe(200);
});

test("leaving the page sends a pending delete straight away (AC3)", async ({ page }) => {
  const role = unique("QA Engineer");
  const id = await make(page, role);
  await page.goto("/dashboard");
  await card(page, role).getByRole("button", { name: "More for Southerly Energy" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("link", { name: "Knowledge base" }).first().click();
  await expect.poll(async () => (await page.request.get(`/api/projects/${id}`)).status(), { timeout: 3_000 }).toBe(404);
});
