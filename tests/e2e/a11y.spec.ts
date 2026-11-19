import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { makeProject } from "./projects";

// SPEC §16, §20 (TASK-29 AC2, AC3): the main screens pass an axe check, fit a phone without sideways scrolling,
// log no console errors, and drop their motion when the system asks for less.
const SCREENS = ["/dashboard", "/kb/roles", "/settings", "/new", "/new/quick", "/new/studio", "/import"];

/** Opens a screen and waits until it has settled (the Workspace once its preview has rendered). */
async function open(page: Page, path: string) {
  await page.goto(path);
  if (path.startsWith("/projects/")) await expect(page.locator("[data-sheet]")).toBeVisible({ timeout: 30_000 });
  else await expect(page.locator("main h1, main [role=heading]").first()).toBeVisible();
}

async function screens(page: Page) {
  const { id } = await makeProject(page);
  return [...SCREENS, `/projects/${id}`];
}

test("the main screens pass axe (WCAG 2 A and AA) (AC3)", async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of await screens(page)) {
    await open(page, path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => `${path}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`)).toEqual([]);
  }
});

test("at phone width the main screens don't scroll sideways and log no console errors (AC2)", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  await page.setViewportSize({ width: 390, height: 844 });
  const wide: string[] = [];
  for (const path of await screens(page)) {
    await open(page, path);
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) wide.push(path);
  }
  expect(wide).toEqual([]);
  expect(errors).toEqual([]);
});

test("with reduced motion, transitions and animations finish at once (AC3)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/settings");
  const durations = await page.getByRole("button", { name: "Test and save" }).first().evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(durations.split(",").every((d) => parseFloat(d) <= 0.0001)).toBe(true);
});
