import { expect, test, type Page } from "@playwright/test";
import { runOnEmptyServer } from "./server";

// SPEC §14.1a resume import and review, §1.4 merge/replace, on its own empty-database server.
runOnEmptyServer(3104);

const RESUME = `Sam Lee
sam.lee@example.com | 0400 111 222

EXPERIENCE
Support Engineer | Harbour Health
• Answered 40 tickets a day

LANGUAGES
English, Korean
`;

type Kb = { contact: { name: string }; roles: { title: string }[]; skills: unknown[]; additional: { title: string; referenceOnly?: boolean }[] };
const getKb = async (page: Page): Promise<Kb> => (await page.request.get("/api/kb")).json();
const file = (name: string, body: string | Buffer) => ({ name, mimeType: "text/plain", buffer: Buffer.isBuffer(body) ? body : Buffer.from(body) });
const alert = (page: Page) => page.getByRole("alert").filter({ hasNotText: /^$/ });
const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const toReview = (page: Page) => page.getByRole("navigation", { name: "Onboarding steps" }).getByRole("button", { name: /Review/ }).click();

test.beforeAll(async ({ request }) => {
  // An existing knowledge base to merge into: Riley Ng with one skill group.
  const draft = { contact: { name: "Riley Ng", email: "riley@example.com", location: "Hobart TAS" }, skills: [{ group: "Frontend", items: ["React"] }] };
  const headers = { origin: "http://127.0.0.1:3104" }; // state-changing requests must come from the app's origin
  const put = await request.put("/api/onboarding", { headers, data: { step: 10, maxStep: 10, draft, completed: false, saveMode: "merge" } });
  const res = await request.post("/api/onboarding/complete", { headers, data: { mode: "replace" } });
  expect([put.status(), res.status(), await res.text()]).toEqual([200, 200, '{"added":2}']);
});

test("bad files and short text show clear errors and change nothing (AC4)", async ({ page }) => {
  const before = await getKb(page);
  await page.goto("/kb/roles");
  await page.getByRole("link", { name: "Import resume" }).click();
  await expect(heading(page)).toHaveText("Import your resume");
  const input = page.getByLabel(/Choose an existing resume/);
  const cases: [ReturnType<typeof file>, string][] = [
    [file("resume.exe", "MZ"), "Choose a PDF, DOCX or TXT file."],
    [file("empty.txt", ""), "This file is empty. Choose another file or paste the text."],
    [file("big.txt", Buffer.alloc(10 * 1024 * 1024 + 1, 97)), "This file is larger than 10 MB. Choose a smaller file or paste the text."],
    [file("resume.pdf", "%PDF-1.7"), "Reading PDF and Word files arrives with your AI provider connection. For now, paste the text or choose a .txt file."],
  ];
  for (const [f, message] of cases) {
    await input.setInputFiles(f);
    await expect(alert(page)).toHaveText(message);
  }
  await page.getByLabel("Or paste your resume text").fill("too short");
  await page.getByRole("button", { name: "Extract and review" }).click();
  await expect(alert(page)).toHaveText("Paste your resume text or choose a non-empty TXT file.");
  expect(await getKb(page)).toEqual(before);
});

test("pasted text opens Review with the import note, and nothing is saved until confirmed (AC1, AC4)", async ({ page }) => {
  const before = await getKb(page);
  await page.goto("/import");
  await page.getByLabel("Or paste your resume text").fill(RESUME);
  await page.getByRole("button", { name: "Extract and review" }).click();
  await expect(page).toHaveURL(/\/onboarding\/manual$/);
  await expect(heading(page)).toHaveText("Review");
  await expect(page.getByText("Pasted resume text")).toBeVisible();
  await expect(page.getByText("Missing information is left blank")).toBeVisible();
  await expect(page.getByText("Needs details")).toHaveCount(1); // the role has no dates; the contact is kept in merge
  // Abandon: leave without saving. The knowledge base is unchanged.
  await page.goto("/kb/roles");
  expect(await getKb(page)).toEqual(before);
});

test("missing details block saving; merge keeps the contact and keeps unknown sections and the original text (AC2, AC3)", async ({ page }) => {
  await page.goto("/onboarding/manual");
  await expect(heading(page)).toHaveText("Review");
  await expect(page.getByLabel("Save behaviour")).toHaveValue("merge");
  await page.getByRole("button", { name: "Save to knowledge base" }).click();
  await expect(page.getByText("Experience needs details before saving.")).toBeVisible();
  await expect(heading(page)).toHaveText("Experience");
  await page.getByRole("button", { name: "Edit Support Engineer" }).click();
  await page.getByLabel("Start").fill("2015");
  await page.getByLabel("End").fill("2016");
  await page.getByRole("button", { name: "Update role" }).click();
  await expect(page.getByText("Needs details")).toHaveCount(0);
  await toReview(page);
  await page.getByRole("button", { name: "Save to knowledge base" }).click();
  await expect(page.getByRole("heading", { name: "Your knowledge base is ready" })).toBeVisible();

  const kb = await getKb(page);
  expect(kb.contact.name).toBe("Riley Ng");
  expect(kb.skills).toHaveLength(1);
  expect(kb.roles.map((r) => r.title)).toEqual(["Support Engineer"]);
  expect(kb.additional.map((a) => [a.title, !!a.referenceOnly])).toEqual([
    ["Contact and introductory details", true],
    ["LANGUAGES", false],
    ["Original resume text (reference)", true],
  ]);
});

test("a TXT upload over an unfinished draft asks first; replace swaps the knowledge base (AC1, AC3)", async ({ page }) => {
  // Leave an unfinished draft behind.
  await page.goto("/import");
  await page.getByLabel("Or paste your resume text").fill(RESUME);
  await page.getByRole("button", { name: "Extract and review" }).click();
  await expect(heading(page)).toHaveText("Review");

  await page.goto("/import");
  await page.getByLabel(/Choose an existing resume/).setInputFiles(file("jo.txt", "Jo Park\njo.park@example.com\n\nVOLUNTEER WORK\nMentor | Code Club\nRan weekly sessions\n"));
  await expect(page.getByText("jo.txt — ready to extract")).toBeVisible();
  await page.getByRole("button", { name: "Extract and review" }).click();
  await expect(page.getByRole("dialog", { name: "Replace the unfinished onboarding draft?" })).toBeVisible();
  await page.getByRole("button", { name: "Review import" }).click();
  await expect(heading(page)).toHaveText("Review");
  await expect(page.getByText("jo.txt", { exact: true })).toBeVisible();

  await page.getByLabel("Save behaviour").selectOption("replace");
  await page.getByRole("button", { name: "Save to knowledge base" }).click();
  await expect(page.getByText("Contact details needs details before saving.")).toBeVisible(); // no location in the file
  await page.getByLabel("Location").fill("Perth WA");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await toReview(page);
  await expect(page.getByLabel("Save behaviour")).toHaveValue("replace");
  await page.getByRole("button", { name: "Save to knowledge base" }).click();
  await expect(page.getByRole("heading", { name: "Your knowledge base is ready" })).toBeVisible();

  const kb = await getKb(page);
  expect(kb.contact.name).toBe("Jo Park");
  expect(kb.roles).toEqual([]);
  expect(kb.skills).toEqual([]);
});
