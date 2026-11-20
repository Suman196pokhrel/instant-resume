import { expect, test, type Page } from "@playwright/test";
import { makeProject, unique } from "./projects";

// SPEC §10, §14.5 Checks tab (TASK-21): findings from the on-device rules engine, and jumps to their sections.
const panel = (page: Page) => page.getByRole("complementary", { name: "Job and checks" });
const inspector = (page: Page) => page.getByRole("complementary", { name: "Inspector" });
const origin = () => ({ origin: new URL(test.info().project.use.baseURL!).origin });
const resumeSections = [
  { id: "s-sum", kind: "summary", title: "Summary", hidden: false, text: "A passionate engineer with eight years and 37 launches." },
  { id: "s-exp", kind: "experience", title: "Experience", hidden: false, items: [{ id: "i-1", ref: "role-brightwater", heading: "Senior Software Engineer", sub: "Brightwater Logistics", bullets: [{ id: "b-1", text: "Cut page load from 4.2s to 0.9s", source: "hl-bw-1" }] }] },
  { id: "s-odd", kind: "summary", title: "My Journey", hidden: false, text: "Grew up coding." },
];

async function openChecks(page: Page, keywords: string[]) {
  const { id } = await makeProject(page, { keywords, requirements: ["Ship things"], resumeSections });
  await page.goto(`/projects/${id}`);
  await panel(page).getByRole("tab", { name: /Checks/ }).click();
  return id;
}

test("the Checks tab shows the verdict, the keyword ring, the findings and parse safety, with no ATS score (AC1)", async ({ page }) => {
  test.setTimeout(60_000);
  await openChecks(page, ["engineer", "Playwright", "Kubernetes"]);
  const p = panel(page);
  await expect(p.getByRole("tab", { name: /Checks/ })).toContainText("3");
  await expect(p.getByRole("status")).toContainText("3 things to review");
  await expect(p.getByRole("status")).toContainText("Select one to jump to it. You can still export.");
  const kw = p.getByRole("region", { name: "Job keyword match" });
  await expect(kw).toContainText("1 of 3");
  await expect(kw).toContainText("keywords appear in this resume");
  await kw.getByRole("button", { name: "Emphasise Playwright" }).hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "It's in your knowledge base. Ask for a rewrite that brings it forward." })).toBeVisible(); // the previous one may still be fading out
  await kw.getByRole("button", { name: "Add Kubernetes" }).hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Not in your knowledge base yet. Add what you did, then it can be claimed." })).toBeVisible(); // the previous one may still be fading out

  const claims = p.getByRole("region", { name: "Claims not found in your knowledge base" });
  await expect(claims.getByRole("button")).toHaveText([/"37" doesn't appear in your knowledge base.*Go to Summary/, /"0\.9s" doesn't match your knowledge base.*Under Brightwater Logistics.*Go to Experience/]);
  await expect(p.getByRole("region", { name: "Banned phrases" }).getByRole("button")).toHaveText([/"passionate" is on the banned-phrase list.*Found in Summary/]);
  await expect(p.getByRole("button", { name: /Parse safety/ })).toContainText("4 of 5 pass");
  await expect(p.getByText("Rename unusual headings so job sites can find them")).toBeVisible(); // open because one fails
  await expect(p.getByText(/There's no universal "ATS score"/)).toBeVisible();
  await expect(page.getByText(/ATS score/)).toHaveCount(1); // only that note
  await expect(p.getByText("Checks run on this device after every change. No LLM call.")).toBeVisible();

  await inspector(page).getByRole("button", { name: /^Summary/ }).click();
  await inspector(page).getByRole("textbox", { name: "Summary text" }).fill("An engineer with eight years.");
  await expect(p.getByRole("status")).toContainText("1 thing to review");
  await expect(p.getByText("No banned phrases")).toBeVisible();

  await page.getByRole("tab", { name: "Cover letter" }).click();
  await expect(p.getByRole("status")).toContainText("Nothing to fix");
  await expect(p.getByRole("status")).toContainText("This cover letter is ready to export.");
  await expect(p.getByText("Every claim traces to your knowledge base")).toBeVisible();
  await expect(p.getByRole("button", { name: /Parse safety/ })).toContainText("5 of 5 pass");
});

test("clicking a finding opens its section on the Content tab and focuses it (AC2)", async ({ page }) => {
  test.setTimeout(60_000);
  await openChecks(page, ["engineer"]);
  await inspector(page).getByRole("tab", { name: "Design" }).click();
  await panel(page).getByRole("button", { name: /"0\.9s" doesn't match/ }).click();
  await expect(inspector(page).getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
  await expect(inspector(page).getByRole("heading", { name: "Experience" })).toBeFocused();
  await panel(page).getByRole("button", { name: /"passionate" is on/ }).click();
  await expect(inspector(page).getByRole("heading", { name: "Summary" })).toBeFocused();
});

test("Emphasise prefills the rewrite instruction; Add it saves a sourced highlight and the keyword can then be emphasised (AC3)", async ({ page }) => {
  test.setTimeout(60_000);
  const keyword = unique("Elixir");
  const name = unique("Checks Test Project");
  const made = await page.request.post("/api/kb/portfolio", { headers: origin(), data: { name, summary: "A test project", highlights: [] } });
  expect(made.status()).toBe(201);
  const entry = await made.json();
  try {
    await openChecks(page, ["engineer", "Playwright", keyword]);
    await panel(page).getByRole("button", { name: "Emphasise Playwright" }).click();
    await expect(inspector(page).getByRole("heading", { name: "Experience" })).toBeVisible();
    const box = inspector(page).getByRole("textbox", { name: "Rewrite this section" });
    await expect(box).toHaveValue("Emphasise Playwright");
    await expect(box).toBeFocused();

    await panel(page).getByRole("button", { name: `Add ${keyword}` }).click();
    const dialog = page.getByRole("dialog", { name: "Add to your knowledge base" });
    await expect(dialog).toContainText(`The job asks for ${keyword}.`);
    await dialog.getByLabel("Add it to").selectOption({ label: name });
    await dialog.getByRole("button", { name: "Save to knowledge base" }).click();
    await expect(dialog.getByText("Describe what you did")).toBeVisible();
    await expect(dialog.getByLabel("What you did and the result")).toBeFocused();
    await dialog.getByLabel("What you did and the result").fill(`Built the job queue in ${keyword}, cutting retries by half`);
    await dialog.getByLabel("Metric").fill("half the retries");
    await dialog.getByRole("button", { name: "Save to knowledge base" }).click();
    await expect(page.getByText(`Added to ${name}`)).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(panel(page).getByRole("button", { name: `Emphasise ${keyword}` })).toBeVisible(); // the checks re-ran on the new KB

    const kb = await (await page.request.get("/api/kb")).json();
    const saved = kb.portfolio.find((e: { id: string }) => e.id === entry.id).highlights;
    expect(saved).toEqual([{ id: expect.any(String), text: `Built the job queue in ${keyword}, cutting retries by half`, metric: "half the retries", skills: [keyword], evidenceFor: keyword }]);
  } finally {
    await page.request.delete(`/api/kb/portfolio/${entry.id}`, { headers: origin() });
  }
});

test("Add what's missing writes bullets from what you say, and adds only the ones you keep (TASK-64)", async ({ page }) => {
  test.setTimeout(90_000);
  const [kwA, kwB] = [unique("Elixir"), unique("Haskell")];
  const [nameA, nameB] = [unique("Missing Alpha"), unique("Missing Beta")];
  const made = await Promise.all([nameA, nameB].map(async (name) => (await page.request.post("/api/kb/portfolio", { headers: origin(), data: { name, summary: "A test project", highlights: [] } })).json()));
  try {
    await openChecks(page, ["engineer", "Playwright", kwA, kwB]);
    const p = panel(page);
    await p.getByRole("button", { name: "Add what's missing" }).click();
    const dialog = page.getByRole("dialog", { name: "Add what's missing" });
    await expect(dialog.getByRole("checkbox", { name: kwA })).toBeChecked();
    await expect(dialog.getByRole("checkbox", { name: kwB })).toBeChecked();
    await expect(dialog.getByRole("checkbox", { name: "Playwright" })).toHaveCount(0); // already in the knowledge base: Emphasise covers it
    await dialog.getByRole("button", { name: "Write it" }).click();
    await expect(dialog.getByText("Say where you used them")).toBeVisible();

    const said = `I built the job queue in ${kwA} on ${nameA}. I also used ${kwB} on ${nameB}.`;
    await dialog.getByLabel("Where did you use them?").fill(said);
    await dialog.getByRole("checkbox", { name: kwB }).click(); // unticked: the model isn't asked for it
    await dialog.getByRole("button", { name: "Write it" }).click();
    await expect(dialog.getByRole("region", { name: nameA })).toBeVisible();
    await expect(dialog.getByRole("region", { name: nameB })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Back" }).click();
    await expect(dialog.getByLabel("Where did you use them?")).toHaveValue(said); // Back keeps what you wrote

    await dialog.getByRole("checkbox", { name: kwB }).click();
    await dialog.getByRole("button", { name: "Write it" }).click();
    const a = dialog.getByRole("region", { name: nameA });
    await expect(a.getByRole("textbox", { name: "Bullet" })).toHaveValue(`I built the job queue in ${kwA} on ${nameA}.`);
    await expect(a.getByText(kwA, { exact: true })).toBeVisible();
    await a.getByRole("textbox", { name: "Bullet" }).fill(`Built the job queue in ${kwA}`);
    await dialog.getByRole("region", { name: nameB }).getByRole("checkbox").click(); // not this one
    await dialog.getByRole("button", { name: "Add 1 to knowledge base" }).click();
    await expect(page.getByText("Added 1 to your knowledge base")).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(p.getByRole("button", { name: `Emphasise ${kwA}` })).toBeVisible(); // the checks re-ran on the new KB
    await expect(p.getByRole("button", { name: `Add ${kwB}` })).toBeVisible();

    const kb = await (await page.request.get("/api/kb")).json();
    const of = (id: string) => kb.portfolio.find((e: { id: string }) => e.id === id).highlights;
    expect(of(made[0].id)).toEqual([{ id: expect.any(String), text: `Built the job queue in ${kwA}`, skills: [kwA], evidenceFor: kwA }]);
    expect(of(made[1].id)).toEqual([]);
  } finally {
    await Promise.all(made.map((e) => page.request.delete(`/api/kb/portfolio/${e.id}`, { headers: origin() })));
  }
});

test("Add what's missing shows the model's error with Try again, and keeps what you wrote (TASK-64)", async ({ page }) => {
  test.setTimeout(60_000);
  const kw = unique("Elixir");
  const id = await openChecks(page, ["engineer", kw]);
  await page.goto(`/projects/${id}?mock=missing-error`);
  await panel(page).getByRole("tab", { name: /Checks/ }).click();
  await panel(page).getByRole("button", { name: "Add what's missing" }).click();
  const dialog = page.getByRole("dialog", { name: "Add what's missing" });
  await dialog.getByLabel("Where did you use them?").fill(`I used ${kw} at work.`);
  await dialog.getByRole("button", { name: "Write it" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Anthropic is having trouble right now");
  await expect(dialog.getByLabel("Where did you use them?")).toHaveValue(`I used ${kw} at work.`);
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByRole("textbox", { name: "Bullet" })).toHaveValue(`I used ${kw} at work.`);
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});
