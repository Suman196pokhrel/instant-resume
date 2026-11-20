import { expect, test, type Page } from "@playwright/test";

// SPEC §13.2 knowledge base screen, on the seeded Jordan Whitlock KB (playwright.config.ts). The tests share one
// database and build on each other, so they run in order.
test.describe.configure({ mode: "serial" });

type Kb = Record<string, { id: string; title?: string; highlights?: { id: string; text: string; skills: string[] }[] }[]>;
const getKb = async (page: Page): Promise<Kb> => (await page.request.get("/api/kb")).json();
const nav = (page: Page) => page.getByRole("navigation", { name: "Knowledge base sections" });
const dialog = (page: Page) => page.getByRole("dialog");
const save = async (page: Page) => {
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByText("Saved to knowledge base")).toBeVisible();
};

test("lists every section in the mock's order with counts (AC1)", async ({ page }) => {
  await page.goto("/kb/roles");
  await expect(nav(page).getByRole("link")).toHaveText([
    "Contact",
    "Work rights",
    "Experience3",
    "Volunteer work0",
    "Portfolio2",
    "Education1",
    "Skills4",
    "Certifications and awards3",
    "Referees2",
    "Additional sections0",
  ]);
  await expect(nav(page).getByRole("link", { name: /Experience/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Brightwater Logistics, Sydney NSW")).toBeVisible();
  await expect(page.getByText("role-brightwater")).toBeVisible();
  await expect(page.getByText("4.2s to 1.1s load")).toBeVisible(); // metric pill

  await nav(page).getByRole("link", { name: /Skills/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Skills" })).toBeVisible();
  await page.goto("/kb/contact");
  await expect(page.getByText("Jordan Whitlock", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add/ })).toHaveCount(0);
});

test("a background with no paid role works: volunteer work without dates, and additional sections (AC4)", async ({ page }) => {
  await page.goto("/kb/volunteering");
  await expect(page.getByRole("heading", { name: "No volunteer work yet" })).toBeVisible();
  await page.getByRole("button", { name: "Add volunteer role" }).click();
  await dialog(page).getByLabel("Job title").fill("Mentor");
  await dialog(page).getByLabel("Organisation").fill("Code Club Australia");
  await save(page);
  await expect(page.getByRole("heading", { name: "Mentor" })).toBeVisible();

  await page.goto("/kb/additional");
  await page.getByRole("button", { name: "Add section" }).click();
  await dialog(page).getByLabel("Section title").fill("Languages");
  await dialog(page).getByLabel("Details").fill("Conversational Japanese");
  await save(page);
  await page.reload();
  await expect(page.getByText("Conversational Japanese")).toBeVisible();
});

test("shows field errors and focuses the first one (AC3)", async ({ page }) => {
  await page.goto("/kb/roles");
  await page.getByRole("button", { name: "Add role" }).click();
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page).getByText("Enter your job title")).toBeVisible();
  await expect(dialog(page).getByText("Enter your employer")).toBeVisible();
  await expect(dialog(page).getByLabel("Job title")).toBeFocused();
  await expect(dialog(page).getByLabel("Job title")).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("Escape");

  await page.goto("/kb/contact");
  await page.getByRole("button", { name: "Edit contact" }).click();
  await dialog(page).getByLabel("Email").fill("nope");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page).getByText("Enter an email like name@example.com")).toBeVisible();
  await expect(dialog(page).getByLabel("Email")).toBeFocused();
});

test("adds, edits and deletes entries and highlights, and keeps highlight IDs (AC2)", async ({ page }) => {
  await page.goto("/kb/roles");
  await page.getByRole("button", { name: "Add role" }).click();
  const d = dialog(page);
  await d.getByLabel("Job title").fill("Support Engineer");
  await d.getByLabel("Employer").fill("Harbour Health");
  await d.getByLabel("Start").fill("Jan 2015");
  await d.getByLabel("End").fill("Feb 2016");
  await d.getByLabel("Highlight 1", { exact: true }).fill("Answered 40 tickets a day");
  await d.getByRole("button", { name: "Add highlight" }).click();
  await expect(d.getByLabel("Highlight 2", { exact: true })).toBeFocused();
  await d.getByLabel("Highlight 2", { exact: true }).fill("Wrote the on-call runbook");
  await save(page);
  await page.reload();
  await expect(page.getByText("Wrote the on-call runbook")).toBeVisible();

  // Edit a seeded role: its highlights keep their IDs and skill tags.
  const before = (await getKb(page)).roles.find((r) => r.id === "role-brightwater")!;
  await page.getByRole("button", { name: "Edit Senior Software Engineer" }).click();
  await d.getByLabel("Job title").fill("Lead Software Engineer");
  await d.getByLabel("Highlight 1", { exact: true }).fill("Rebuilt the tracking dashboard, cutting load from 4.2s to 1.1s");
  await save(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lead Software Engineer" })).toBeVisible();
  const after = (await getKb(page)).roles.find((r) => r.id === "role-brightwater")!;
  expect(after.title).toBe("Lead Software Engineer");
  expect(after.highlights!.map((h) => [h.id, h.skills])).toEqual(before.highlights!.map((h) => [h.id, h.skills]));
  expect(after.highlights![0].text).toBe("Rebuilt the tracking dashboard, cutting load from 4.2s to 1.1s");

  // Remove a highlight, then delete the entry.
  await page.getByRole("button", { name: "Edit Support Engineer" }).click();
  await d.getByRole("button", { name: "Remove highlight 1" }).click();
  await save(page);
  await page.reload();
  await expect(page.getByText("Answered 40 tickets a day")).toHaveCount(0);
  await expect(page.getByText("Wrote the on-call runbook")).toBeVisible();

  // Undo puts it back where it was, with the same IDs (TASK-36).
  const ids = (await getKb(page)).roles.map((r) => r.id);
  const kept = (await getKb(page)).roles.find((r) => r.title === "Support Engineer")!;
  await page.getByRole("button", { name: "Edit Support Engineer" }).click();
  await d.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "Support Engineer" })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Entry restored")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Support Engineer" })).toBeVisible();
  expect((await getKb(page)).roles.map((r) => r.id)).toEqual(ids);
  expect((await getKb(page)).roles.find((r) => r.id === kept.id)).toEqual(kept);

  await page.getByRole("button", { name: "Edit Support Engineer" }).click();
  await d.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Entry deleted")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Support Engineer" })).toHaveCount(0);
  expect((await getKb(page)).roles.map((r) => r.id)).toEqual(["role-brightwater", "role-mosaic", "role-civic"]);
});

test("an emptied section shows its empty state (AC4)", async ({ page }) => {
  await page.goto("/kb/additional");
  await page.getByRole("button", { name: "Edit Languages" }).click();
  await dialog(page).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "No additional sections yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add section" })).toBeFocused(); // the deleted card's Edit is gone
  await expect(page.getByText("Add one and it becomes available to every application.")).toBeVisible();
});

test("the dialog works from the keyboard and returns focus (DoD)", async ({ page }) => {
  await page.goto("/kb/education");
  const edit = page.getByRole("button", { name: /^Edit Bachelor/ });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page).getByRole("heading", { name: "Edit qualification" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(edit).toBeFocused();
});

test("at phone width the section nav is one scrolling row (DoD)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/kb/roles");
  const links = nav(page).getByRole("link");
  const [a, b] = [await links.nth(0).boundingBox(), await links.nth(1).boundingBox()];
  expect(b!.y).toBe(a!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("a failed save says so and lets you try again", async ({ page }) => {
  await page.goto("/kb/referees");
  await page.getByRole("button", { name: "Edit Dana Okafor" }).click();
  await page.route("**/api/kb/referees/**", (route) => route.abort());
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Couldn't save your changes. Try again.")).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "Save" })).toBeEnabled();
});
