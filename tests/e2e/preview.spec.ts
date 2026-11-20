import { expect, test, type Page } from "@playwright/test";
import { makeProject } from "./projects";

// SPEC §9.1, §14.5 Preview (TASK-46): section outlines and bullet sources placed from Typst's labelled positions.
const inspector = (page: Page) => page.getByRole("complementary", { name: "Inspector" });
const panel = (page: Page) => page.getByRole("complementary", { name: "Job and checks" });
const section = (page: Page, id: string) => page.locator(`[data-preview-section="${id}"]`);
const bullet = (page: Page, id: string) => page.locator(`[data-preview-bullet="${id}"]`);
const resumeSections = [
  { id: "s-sum", kind: "summary", title: "Summary", hidden: false, text: "Engineer with eight years in web apps." },
  {
    id: "s-exp",
    kind: "experience",
    title: "Experience",
    hidden: false,
    items: [
      {
        id: "i-1",
        ref: "role-brightwater",
        heading: "Senior Software Engineer",
        sub: "Brightwater Logistics",
        bullets: [
          { id: "b-ok", text: "Cut page load from 4.2s to 1.1s", source: "hl-bw-1" },
          { id: "b-off", text: "Cut page load from 4.2s to 0.9s", source: "hl-bw-1" },
          { id: "b-gone", text: "Ran the release train", source: "hl-deleted" },
        ],
      },
    ],
  },
];

/** The pointer leaves, so the next hover's tooltip is the only one. */
async function away(page: Page) {
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
}

async function open(page: Page) {
  const { id } = await makeProject(page, { resumeSections });
  await page.goto(`/projects/${id}`);
  await expect(section(page, "s-exp")).toBeAttached({ timeout: 30_000 }); // the renderer is warm and the marks are placed
}

test("selecting a section in Content outlines it in the preview and flashes it (AC1, AC2)", async ({ page }) => {
  await open(page);
  const box = await section(page, "s-exp").boundingBox();
  const heading = await page.locator("[data-sheet]").getByText("Experience", { exact: true }).boundingBox();
  expect(heading!.y).toBeGreaterThanOrEqual(box!.y - 2); // the outline sits over its own section
  expect(heading!.y).toBeLessThan(box!.y + box!.height);
  await inspector(page).getByRole("button", { name: /Experience/ }).click();
  await expect(section(page, "s-exp")).toHaveAttribute("data-selected", "true");
  await expect(section(page, "s-exp")).toHaveClass(/animate-flash/);
  await expect(section(page, "s-sum")).not.toHaveAttribute("data-selected");
});

test("clicking a section in the preview selects it (AC4)", async ({ page }) => {
  await open(page);
  await section(page, "s-sum").click();
  await expect(inspector(page).getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(section(page, "s-sum")).toHaveAttribute("data-selected", "true");
  await expect(section(page, "s-sum")).not.toHaveClass(/animate-flash/); // already in view: no scroll, no flash
});

test("hovering a bullet in the selected section shows its source, a difference, or no source (AC3, AC5)", async ({ page }) => {
  await open(page);
  await expect(bullet(page, "b-ok")).toHaveCount(0); // only in the selected section
  await inspector(page).getByRole("button", { name: /Experience/ }).click();
  await bullet(page, "b-ok").hover();
  await expect(page.getByRole("tooltip")).toContainText("From your knowledge base");
  await expect(page.getByRole("tooltip")).toContainText("Rebuilt the shipment tracking dashboard");
  await away(page);
  await bullet(page, "b-off").hover();
  await expect(page.getByRole("tooltip")).toContainText("Differs from your knowledge base");
  await expect(page.getByRole("tooltip")).toContainText("Rebuilt the shipment tracking dashboard");
  await away(page);
  await bullet(page, "b-gone").hover();
  await expect(page.getByRole("tooltip")).toContainText("No source found");
});

test("a Checks finding's Go to flashes its section in the preview (AC6)", async ({ page }) => {
  await open(page);
  await panel(page).getByRole("tab", { name: /Checks/ }).click();
  await panel(page).getByRole("button", { name: /0\.9s.*Go to Experience/ }).click();
  await expect(section(page, "s-exp")).toHaveAttribute("data-selected", "true");
  await expect(section(page, "s-exp")).toHaveClass(/animate-flash/);
});

test("a second page shows as its own sheet, with a labelled gap at the break (owner's bug: 2 pages looked like 1)", async ({ page }) => {
  const long = Array.from({ length: 160 }, (_, i) => `Sentence ${i + 1} about shipping web apps for customers.`).join(" ");
  const { id } = await makeProject(page, { resumeSections: [{ id: "s-sum", kind: "summary", title: "Summary", hidden: false, text: long }, ...resumeSections.slice(1)] });
  await page.goto(`/projects/${id}`);
  await expect(page.getByText(/Rendered in \d+ ms · 2 pages/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-page-break]")).toHaveCount(1);
  await expect(page.locator("[data-page-break]")).toContainText("Page 2");
});

test("moving a section in Structure flashes it in the list and, once laid out, in the preview (owner's bug: reorder felt abrupt)", async ({ page }) => {
  await open(page);
  await inspector(page).getByRole("tab", { name: "Structure" }).click();
  const before = (await section(page, "s-exp").boundingBox())!.y;
  await inspector(page).getByRole("listitem", { name: /^Experience/ }).getByRole("button", { name: "Move up" }).click();
  await expect(inspector(page).getByRole("listitem", { name: /^Experience/ }).locator(".animate-flash")).toBeAttached();
  await expect(section(page, "s-exp")).toHaveClass(/animate-flash/);
  expect((await section(page, "s-exp").boundingBox())!.y).toBeLessThan(before); // flashed at its new place
});

test("Export warns when the resume runs past the page budget, and Fit to 1 page fixes it (owner's bug: long resume exported on 2 pages)", async ({ page }) => {
  test.setTimeout(60_000);
  const long = Array.from({ length: 72 }, (_, i) => `Sentence ${i + 1} about shipping web apps for customers.`).join(" ");
  const { id } = await makeProject(page, { resumeSections: [{ id: "s-sum", kind: "summary", title: "Summary", hidden: false, text: long }, ...resumeSections.slice(1)] });
  await page.goto(`/projects/${id}`);
  await expect(page.getByText(/Rendered in \d+ ms · 2 pages/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Export PDF" }).click();
  const dialog = page.getByRole("dialog", { name: "Export PDF" });
  await expect(dialog).toContainText("Resume: 2 pages (target 1).");
  await dialog.getByRole("button", { name: "Fit to 1 page" }).click();
  await expect(page.getByText("Fitted. Check the preview, then export.")).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByText(/Resume: 2 pages/)).toHaveCount(0);
  await expect(page.getByText(/Rendered in \d+ ms · 1 page/)).toBeVisible();
});

test("each render is patched into the page on screen and ends up identical to a fresh render (owner's ask: instant, smooth edits)", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  const svg = () => page.locator("[data-sheet]").evaluate((el) => el.shadowRoot!.querySelector("svg")!.outerHTML);
  const shown = await page.locator("[data-sheet]").evaluate((el) => el.shadowRoot!.querySelector("svg"));
  expect(shown).toBeTruthy();
  const ins = inspector(page);
  await ins.getByRole("button", { name: /Summary/ }).click();
  await ins.getByRole("textbox", { name: "Summary text" }).pressSequentially(" Leads platform teams and writes the incident handbook used across four squads.", { delay: 5 }); // adds a line
  await ins.getByRole("button", { name: "All sections" }).click();
  await ins.getByRole("button", { name: /Experience/ }).click();
  await ins.getByRole("textbox", { name: "Bullet 2" }).fill("Cut page load to 0.8s");
  await ins.getByRole("tab", { name: "Design" }).click();
  await ins.getByRole("button", { name: "Accent #1F4E8C" }).click();
  await ins.getByRole("radio", { name: "Carlito" }).click(); // every glyph changes
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  let patched = "";
  await expect.poll(async () => patched === (patched = await svg()), { intervals: [300] }).toBe(true); // settled
  expect(patched).toContain("#1F4E8C".toLowerCase().slice(1, 3)); // sanity: the new accent is in
  await page.reload();
  await expect(section(page, "s-exp")).toBeAttached({ timeout: 30_000 });
  await expect.poll(svg).toBe(patched);
});
