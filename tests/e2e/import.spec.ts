import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import { PROVIDERS } from "../../lib/llm/providers";
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

const FIXTURES = join(__dirname, "../fixtures/import");

type Kb = { contact: { name: string }; roles: { title: string }[]; skills: unknown[]; additional: { title: string; referenceOnly?: boolean }[] };
const getKb = async (page: Page): Promise<Kb> => (await page.request.get("/api/kb")).json();
const file = (name: string, body: string | Buffer) => ({ name, mimeType: "text/plain", buffer: Buffer.isBuffer(body) ? body : Buffer.from(body) });
const alert = (page: Page) => page.getByRole("main").getByRole("alert").filter({ hasNotText: /^$/ }); // not Next.js' route announcer
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
    [file("broken.pdf", "%PDF-1.7"), "Could not read the file. Try another file or paste its text."],
    [file("broken.docx", "PK not a zip"), "Could not read the file. Try another file or paste its text."],
  ];
  for (const [f, message] of cases) {
    await input.setInputFiles(f);
    await expect(alert(page)).toHaveText(message);
  }
  await page.getByLabel("Or paste your resume text").fill("too short");
  await page.getByRole("button", { name: "Extract and review" }).click();
  await expect(alert(page)).toHaveText("Paste your resume text or choose a non-empty file.");
  for (const [name, message] of [
    ["scanned.pdf", "This PDF has no selectable text, so it looks like a scan. Export it again as a text PDF, or paste the text."],
    ["locked.pdf", "This PDF is password-protected. Remove the password, or paste the text."],
  ]) {
    await input.setInputFiles(join(FIXTURES, name));
    await expect(alert(page)).toHaveText(message);
  }
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

/** Connects Anthropic with a stubbed key test, and records any other request to a provider. */
async function connectAnthropic(page: Page) {
  const calls: string[] = [];
  await page.route(/api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com/, (route) => {
    calls.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ data: PROVIDERS[0].models.map((id) => ({ id })) }) });
  });
  await page.goto("/settings");
  const card = page.locator("[data-provider=anthropic]");
  await card.getByLabel("API key").fill("sk-ant-api03-test-key-0123456789a9F2");
  await card.getByRole("button", { name: "Test and save" }).click();
  await expect(card.getByText("Encrypted on this device", { exact: true })).toBeVisible();
  calls.length = 0;
  return calls;
}

test("PDF and Word files are read on this device; with no model, the on-device parser sorts them (SPEC §14.1a)", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (r) => /anthropic|openai|googleapis/.test(r.url()) && calls.push(r.url()));
  await page.goto("/import");
  await expect(page.getByText("Connect a provider in Settings for better extraction.")).toBeVisible();
  const input = page.getByLabel(/Choose an existing resume/);
  for (const name of ["resume.docx", "resume.pdf"]) {
    await input.setInputFiles(join(FIXTURES, name));
    await expect(page.getByText(`${name} — ready to extract`)).toBeVisible();
    await expect(page.getByLabel("Or paste your resume text")).toHaveValue(/Brightwater Logistics[\s\S]*Reduced AWS spend by 25%/);
  }
  await page.getByRole("button", { name: "Extract and review" }).click();
  await expect(heading(page)).toHaveText("Review");
  await expect(page.getByText("resume.pdf")).toBeVisible();
  expect(calls).toEqual([]); // nothing left the device
});

test("with Anthropic connected, the transfer is explained before anything is sent; Send opens Review with the file's details (AC1-AC3)", async ({ page }) => {
  await connectAnthropic(page);
  await page.goto("/import");
  await page.getByLabel(/Choose an existing resume/).setInputFiles(join(FIXTURES, "resume.pdf"));
  await page.getByRole("button", { name: "Extract and review" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toHaveText("Send your resume to Anthropic?");
  await expect(dialog).toContainText("Your resume text goes straight from this browser to Anthropic (claude-sonnet-5-5) to sort it into sections. It isn't sent to Instant Resume's server.");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/import$/);

  await page.getByRole("button", { name: "Extract and review" }).click();
  await page.getByRole("button", { name: "Send to Anthropic" }).click();
  await expect(page.getByText("Sorting your resume with Anthropic. This usually takes 10 to 30 seconds.")).toBeVisible();
  await expect(heading(page)).toHaveText("Review");
  await expect(page.getByText("resume.pdf")).toBeVisible();
  await expect(page.getByText("Senior Software Engineer").first()).toBeVisible();
  await expect(page.getByText("LANGUAGES").first()).toBeVisible(); // an unknown section is kept
});

test("a provider failure explains itself and Try again recovers; Cancel keeps the text (AC4)", async ({ page }) => {
  await connectAnthropic(page);
  await page.goto("/import?mock=extract-error");
  await page.getByLabel("Or paste your resume text").fill(RESUME);
  await page.getByRole("button", { name: "Extract and review" }).click();
  await page.getByRole("button", { name: "Send to Anthropic" }).click();
  await page.getByRole("main").getByRole("button", { name: "Cancel" }).click(); // mid-extract (the dialog's own Cancel is outside main)
  await expect(page.getByRole("button", { name: "Extract and review" })).toBeEnabled();
  await expect(page.getByLabel("Or paste your resume text")).toHaveValue(RESUME);
  await expect(page).toHaveURL(/\/import\?mock=extract-error$/);

  await page.getByRole("button", { name: "Extract and review" }).click();
  await page.getByRole("button", { name: "Send to Anthropic" }).click();
  const callout = page.getByRole("alert").filter({ hasText: "having trouble" });
  await expect(callout).toContainText("Anthropic is having trouble right now");
  await expect(page.getByRole("button", { name: "Read on this device instead" })).toBeVisible();
  await callout.getByRole("button", { name: "Try again" }).click();
  await expect(heading(page)).toHaveText("Review");
});
