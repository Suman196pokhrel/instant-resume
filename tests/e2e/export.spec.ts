import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { makeProject, SUMMARY } from "./projects";

// SPEC §9.3 Export (TASK-23): Typst compiles in the worker, the browser downloads, the text reads in order.
const dialog = (page: Page) => page.getByRole("dialog", { name: "Export PDF" });

async function pdfText(path: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(path)) }).promise;
  const items = (await (await doc.getPage(1)).getTextContent()).items as { str: string }[];
  return items.map((i) => i.str).filter((s) => s.trim());
}

test("the dialog shows both file names with the company sanitised and pre-ticks the open document (AC1)", async ({ page }) => {
  const { id } = await makeProject(page, { company: "Southerly Energy (AU) Pty." });
  await page.goto(`/projects/${id}`);
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect(dialog(page)).toContainText("Jordan-Whitlock-Resume-Southerly-Energy-AU-Pty.pdf");
  await expect(dialog(page)).toContainText("Jordan-Whitlock-Cover-Letter-Southerly-Energy-AU-Pty.pdf");
  await expect(dialog(page).getByRole("checkbox", { name: /Resume/ })).toBeChecked();
  await expect(dialog(page).getByRole("checkbox", { name: /Cover letter/ })).not.toBeChecked();
  await expect(dialog(page).getByText(/Checks found/)).toHaveCount(0);
  await dialog(page).getByRole("checkbox", { name: /Resume/ }).click();
  await expect(dialog(page).getByRole("button", { name: "Export PDF" })).toBeDisabled(); // nothing ticked
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "Cover letter" }).click();
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect(dialog(page).getByRole("checkbox", { name: /Cover letter/ })).toBeChecked();
  await expect(dialog(page).getByRole("checkbox", { name: /Resume/ })).not.toBeChecked();
});

test("a project with findings shows the warning but still exports (AC1)", async ({ page }) => {
  const { id } = await makeProject(page, { resumeSections: [{ id: "s-sum", kind: "summary", title: "Summary", hidden: false, text: "A passionate engineer." }] });
  await page.goto(`/projects/${id}`);
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect(dialog(page)).toContainText("Checks found 1 issue across both documents. You can still export.");
  await expect(dialog(page).getByRole("button", { name: "Export PDF" })).toBeEnabled();
});

test("Export downloads selectable PDFs whose text starts with the name (AC2)", async ({ page }) => {
  test.setTimeout(90_000);
  const { id } = await makeProject(page, { company: "Southerly Energy" });
  await page.goto(`/projects/${id}`);
  await page.getByRole("button", { name: "Export PDF" }).click();
  const first = page.waitForEvent("download");
  await dialog(page).getByRole("button", { name: "Export PDF" }).click();
  const resume = await first;
  expect(resume.suggestedFilename()).toBe("Jordan-Whitlock-Resume-Southerly-Energy.pdf");
  const text = await pdfText(await resume.path());
  expect(text[0]).toBe("Jordan Whitlock"); // reading order starts with the name
  expect(text.join(" ")).toContain(SUMMARY);
  await expect(page.getByText("Exported Jordan-Whitlock-Resume-Southerly-Energy.pdf")).toBeVisible();

  await page.getByRole("button", { name: "Export PDF" }).click();
  await dialog(page).getByRole("checkbox", { name: /Cover letter/ }).click();
  const files: string[] = [];
  page.on("download", (d) => files.push(d.suggestedFilename()));
  await dialog(page).getByRole("button", { name: "Export PDF" }).click();
  await expect(page.getByText("Exported Jordan-Whitlock-Resume-Southerly-Energy.pdf and Jordan-Whitlock-Cover-Letter-Southerly-Energy.pdf")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => files).toEqual(["Jordan-Whitlock-Resume-Southerly-Energy.pdf", "Jordan-Whitlock-Cover-Letter-Southerly-Energy.pdf"]);
});
