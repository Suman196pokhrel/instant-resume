import { expect, test, type Page } from "@playwright/test";
import { makeProject, SUMMARY } from "./projects";

// SPEC §14.5 Workspace: bar, preview and Content inspector with hand edits and autosave (TASK-15).
const preview = (page: Page) => page.getByRole("region", { name: "Preview" });
const sheet = (page: Page) => preview(page).locator("[data-sheet] svg").first();

test("the Workspace shows the bar, a rendered preview and the sections (AC4)", async ({ page }) => {
  test.setTimeout(60_000);
  const { id, role } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  const bar = page.locator("header", { has: page.getByRole("tablist", { name: "Document" }) });
  await expect(bar.getByRole("link", { name: "Applications" })).toHaveAttribute("href", "/dashboard");
  await expect(page.getByText(`${role} at Southerly Energy`)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Resume" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  await expect(preview(page).getByText(/^Rendered in \d+ ms · 1 page · A4$/)).toBeVisible();
  await expect(preview(page).getByRole("button", { name: "Fit to width" })).toHaveText(/^\d+% fit$/);
  await preview(page).getByRole("button", { name: "Zoom in" }).click();
  await expect(preview(page).getByRole("button", { name: "Fit to width" })).toHaveText(/^\d+%$/);

  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await expect(inspector.getByRole("heading", { name: "Sections" })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /Summary/ })).toContainText(SUMMARY);
  await page.getByRole("tab", { name: "Cover letter" }).click();
  await expect(inspector.getByRole("heading", { name: "Paragraphs" })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /Opening/ })).toBeVisible();
});

test("typing updates the preview, saves, and survives a reload (AC1, AC2, DoD)", async ({ page }) => {
  test.setTimeout(60_000);
  const { id } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  const before = await sheet(page).innerHTML();

  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByRole("button", { name: /Summary/ }).focus();
  await page.keyboard.press("Enter");
  await expect(inspector.getByText("Updates the preview as you type")).toBeVisible();
  const text = inspector.getByRole("textbox", { name: "Summary text" });
  await text.fill(`${SUMMARY} Mentored three graduates.`);
  await expect(page.getByText("Saving", { exact: true })).toBeVisible();
  await expect.poll(() => sheet(page).innerHTML(), { timeout: 10_000 }).not.toBe(before);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

  await inspector.getByRole("textbox", { name: "Section heading" }).fill("Profile");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await inspector.getByRole("button", { name: /Profile/ }).click();
  await expect(inspector.getByRole("textbox", { name: "Profile text" })).toHaveValue(`${SUMMARY} Mentored three graduates.`);
  await inspector.getByRole("button", { name: "All sections" }).click();

  await inspector.getByRole("button", { name: /Experience/ }).click();
  await inspector.getByRole("textbox", { name: "Bullet 1" }).fill("Cut page load to 1.1s");
  await inspector.getByRole("button", { name: "Remove bullet 1" }).click();
  await expect(inspector.getByRole("textbox", { name: "Bullet 1" })).toHaveCount(0);
});

test("Copy puts the document's plain text on the clipboard (AC3)", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { id } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  await page.getByRole("button", { name: "Copy as plain text" }).click();
  await expect(page.getByText("Resume copied as plain text")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^Jordan Whitlock\n/);
  expect(text).toContain(`\nSUMMARY\n${SUMMARY}`);
  expect(text).toContain("• Cut page load from 4.2s to 1.1s");
});

test("an unknown project is a 404", async ({ page }) => {
  expect((await page.goto("/projects/p-nope"))?.status()).toBe(404);
});

// TASK-16: rewrite one section with an instruction (SPEC §8.3 call 4, §14.5 Instruction box and Proposal card).
const inspectorOf = (page: Page) => page.getByRole("complementary", { name: "Inspector" });
function documentPuts(page: Page) {
  const bodies: { revision: { kind: string; label: string } }[] = [];
  page.on("request", (r) => r.method() === "PUT" && r.url().includes("/api/documents/") && bodies.push(r.postDataJSON()));
  return bodies;
}
async function openSection(page: Page, name: RegExp) {
  const { id } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  await inspectorOf(page).getByRole("button", { name }).click();
  return inspectorOf(page).getByRole("textbox", { name: /Rewrite this/ });
}

test("Emphasise Mentoring proposes a knowledge base bullet; Accept applies and saves it as a rewrite (AC1-3, DoD)", async ({ page }) => {
  test.setTimeout(60_000);
  const puts = documentPuts(page);
  const box = await openSection(page, /Experience/);
  const inspector = inspectorOf(page);
  await expect(inspector.getByText(/^Sends only this section, about [\d,]+ tokens$/)).toBeVisible();
  await box.fill("Emphasise Mentoring");
  await box.press("Control+Enter");
  await expect(box).toBeDisabled();
  await expect(inspector.getByRole("status")).toContainText(/Rewriting with /);
  await expect(inspector.getByRole("textbox", { name: "Bullet 1" })).toBeDisabled(); // hand edits wait

  await expect(inspector.getByText("Proposed change")).toBeVisible({ timeout: 10_000 });
  await expect(inspector.getByText("Proposed change").locator("xpath=../..")).toBeFocused();
  await expect(inspector.getByText('"Emphasise Mentoring"')).toBeVisible();
  const diff = inspector.getByLabel("Changes");
  await expect(diff.locator("ins")).toContainText("Mentored three graduate engineers");
  await expect(diff.getByText("from knowledge base")).toBeVisible();
  await inspector.getByRole("button", { name: "1 patch operation, validated" }).click();
  await expect(inspector.locator("pre")).toContainText('"source": "hl-bw-5"');
  expect(puts).toHaveLength(0); // nothing saved while it is only proposed

  await inspector.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Change applied to Experience")).toBeVisible();
  await expect(inspector.getByRole("textbox", { name: "Bullet 1" })).toHaveValue(/^Mentored three graduate engineers/);
  await expect(inspector.getByRole("textbox", { name: "Bullet 2" })).toHaveValue("Cut page load from 4.2s to 1.1s");
  await expect(inspector.getByRole("textbox", { name: /Rewrite this/ })).toBeFocused();
  await expect.poll(() => puts.map((p) => p.revision)).toEqual([{ kind: "rewrite", label: 'Rewrote Experience: "Emphasise Mentoring"' }]);
});

test("Reject leaves the section untouched and saves nothing (AC3)", async ({ page }) => {
  test.setTimeout(60_000);
  const puts = documentPuts(page);
  const box = await openSection(page, /Experience/);
  const inspector = inspectorOf(page);
  await box.fill("Emphasise Mentoring");
  await inspector.getByRole("button", { name: "Rewrite", exact: true }).click();
  await inspector.getByRole("button", { name: "Reject" }).click({ timeout: 10_000 });
  await expect(page.getByText("Change rejected. Nothing was applied.")).toBeVisible();
  await expect(inspector.getByRole("textbox", { name: "Bullet 1" })).toHaveValue("Cut page load from 4.2s to 1.1s");
  await expect(inspector.getByRole("textbox", { name: "Bullet 2" })).toHaveCount(0);
  await expect(inspector.getByRole("textbox", { name: /Rewrite this/ })).toBeFocused();
  await page.waitForTimeout(1000); // longer than the save debounce
  expect(puts).toHaveLength(0);
});

test("a cover letter paragraph: a suggestion chip rewrites it and Accept applies it (AC3)", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => ((window as { __llmCalls?: string[] }).__llmCalls = []));
  const { id } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Cover letter" }).click();
  const inspector = inspectorOf(page);
  await inspector.getByRole("button", { name: /Opening/ }).click();
  await expect(inspector.getByText(/^Sends only this paragraph/)).toBeVisible();
  await inspector.getByRole("button", { name: "Emphasise Go" }).click();
  await expect(inspector.getByRole("textbox", { name: /Rewrite this paragraph/ })).toHaveValue("Emphasise Go");
  await expect(inspector.getByLabel("Changes").locator("ins")).toContainText("with a particular focus on Go", { timeout: 10_000 });
  await inspector.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Change applied to Opening")).toBeVisible();
  await expect(inspector.getByRole("textbox", { name: "Opening text" })).toHaveValue("Opening paragraph, with a particular focus on Go.");
  expect(await page.evaluate(() => (window as { __llmCalls?: string[] }).__llmCalls)).toEqual(["rewrite"]); // the spy sees real calls
});

test("no change shows the §8 message with a different example; an empty instruction asks for one (AC4)", async ({ page }) => {
  test.setTimeout(60_000);
  const box = await openSection(page, /Experience/);
  const inspector = inspectorOf(page);
  await inspector.getByRole("button", { name: "Rewrite", exact: true }).click();
  await expect(inspector.getByText("Type an instruction first, or pick one of the suggestions.")).toBeVisible();
  await box.fill("make it sparkle");
  await box.press("Control+Enter");
  await expect(inspector.getByText('No change suggested for "make it sparkle". Try a different instruction, like "emphasise Go".')).toBeVisible({ timeout: 10_000 });
  await expect(box).toBeFocused();
  await expect(inspector.getByText("Proposed change")).toHaveCount(0);
});

// TASK-17: Structure tab (SPEC §14.5): reorder and hide sections, with no LLM call.
async function openStructure(page: Page) {
  await page.addInitScript(() => ((window as { __llmCalls?: string[] }).__llmCalls = [])); // the mock adapter's spy
  const { id } = await makeProject(page);
  await page.goto(`/projects/${id}`);
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  await inspectorOf(page).getByRole("tab", { name: "Structure" }).click();
  return inspectorOf(page).getByRole("list", { name: "Sections" });
}
const order = (list: ReturnType<Page["getByRole"]>) => list.getByRole("listitem").evaluateAll((li) => li.map((x) => x.getAttribute("aria-label")));
const llmCalls = (page: Page) => page.evaluate(() => (window as { __llmCalls?: string[] }).__llmCalls);

test("Alt+ArrowDown moves the focused section, announces it, keeps focus and saves (AC1, DoD)", async ({ page }) => {
  test.setTimeout(60_000);
  const puts = documentPuts(page);
  const list = await openStructure(page);
  await expect(inspectorOf(page).getByText("Drag to reorder, or focus a row and press Alt with the up or down arrow. Hidden sections stay in the document.")).toBeVisible();
  const summary = list.getByRole("listitem", { name: /^Summary/ });
  await expect(summary.getByRole("button", { name: "Move up" })).toBeDisabled();
  await expect(list.getByRole("listitem", { name: /^Experience/ }).getByRole("button", { name: "Move down" })).toBeDisabled();
  await summary.focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect.poll(() => order(list)).toEqual(["Experience, position 1 of 2", "Summary, position 2 of 2"]);
  await expect(page.getByText("Summary moved to position 2")).toBeAttached();
  await expect(list.getByRole("listitem", { name: /^Summary/ })).toBeFocused();
  await expect.poll(() => puts.map((p) => p.revision)).toEqual([{ kind: "structure", label: "Moved Summary down" }]);
  await page.keyboard.press("Alt+ArrowUp");
  await expect.poll(() => order(list)).toEqual(["Summary, position 1 of 2", "Experience, position 2 of 2"]);
  await expect(list.getByRole("listitem", { name: /^Summary/ })).toBeFocused(); // the focused row's own node moved this time
  await list.getByRole("listitem", { name: /^Experience/ }).focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect(list.getByRole("listitem", { name: /^Experience/ })).toBeFocused();
  expect(await llmCalls(page)).toEqual([]); // AC3
});

test("dragging a row onto the top half of another puts it above (AC1)", async ({ page }) => {
  test.setTimeout(60_000);
  const list = await openStructure(page);
  await list.getByRole("listitem", { name: /^Experience/ }).dragTo(list.getByRole("listitem", { name: /^Summary/ }), { targetPosition: { x: 40, y: 3 } });
  await expect.poll(() => order(list)).toEqual(["Experience, position 1 of 2", "Summary, position 2 of 2"]);
  expect(await llmCalls(page)).toEqual([]); // AC3
});

test("a hidden section leaves the preview but stays listed, and can be shown again (AC2, AC3)", async ({ page }) => {
  test.setTimeout(60_000);
  const puts = documentPuts(page);
  const list = await openStructure(page);
  const before = await sheet(page).innerHTML();
  await list.getByRole("button", { name: "Hide Summary" }).focus();
  await page.keyboard.press("Enter");
  await expect(list.getByRole("listitem", { name: "Summary, position 1 of 2, hidden" })).toContainText("Hidden");
  await expect.poll(() => sheet(page).innerHTML()).not.toBe(before);
  await inspectorOf(page).getByRole("tab", { name: "Content" }).click();
  await expect(inspectorOf(page).getByRole("button", { name: /Summary/ })).toContainText("Hidden");
  await inspectorOf(page).getByRole("tab", { name: "Structure" }).click();
  await list.getByRole("button", { name: "Show Summary" }).click();
  await expect(list.getByRole("listitem", { name: "Summary, position 1 of 2" })).not.toContainText("Hidden");
  await expect.poll(() => sheet(page).innerHTML()).toBe(before);
  await expect.poll(() => puts.map((p) => p.revision.label)).toEqual(["Hid Summary", "Showed Summary"]);
  expect(await llmCalls(page)).toEqual([]);
});
