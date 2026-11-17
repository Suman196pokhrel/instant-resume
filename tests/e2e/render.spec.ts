import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// TASK-5 Typst spike (SPEC §9.1–9.2): real PDFs from the worker, timings, text order, lazy loading.
const has = (bin: string) => {
  try {
    execFileSync("which", [bin]);
    return true;
  } catch {
    return false;
  }
};
const dir = mkdtempSync(join(tmpdir(), "ir-render-"));
const renders = (page: Page) => page.getByRole("list", { name: "Renders" }).getByRole("listitem");

async function renderAndSave(page: Page, button: string, kind: "resume" | "coverLetter") {
  const before = await renders(page).count();
  await page.getByRole("button", { name: button }).click();
  const error = page.locator("pre[role=alert]");
  await expect(renders(page).or(error)).toHaveCount(before + 1, { timeout: 60_000 }).catch(() => {});
  if (await error.count()) throw new Error(`Render failed: ${await error.textContent()}`);
  await expect(renders(page)).toHaveCount(before + 1, { timeout: 60_000 });
  const row = renders(page).first();
  await expect(row).toHaveAttribute("data-kind", kind);
  const download = page.waitForEvent("download");
  await row.getByRole("link").click();
  const file = join(dir, `${kind}-${before}.pdf`);
  await (await download).saveAs(file);
  return { file, ms: Number(await row.getAttribute("data-ms")), text: (await row.textContent()) ?? "" };
}

test.describe.configure({ mode: "serial" });

test("compiles the sample resume and cover letter to PDFs with embedded fonts, and times a theme change (AC1–AC3)", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/dev/render");

  const cold = await renderAndSave(page, "Render resume", "resume");
  expect(readFileSync(cold.file).subarray(0, 5).toString()).toBe("%PDF-");
  expect(cold.text).toMatch(/Rendered in \d+ ms · [1-9]\d* pages? · A4/);

  const letter = await renderAndSave(page, "Render cover letter", "coverLetter");
  expect(readFileSync(letter.file).subarray(0, 5).toString()).toBe("%PDF-");

  const theme = await renderAndSave(page, "Change theme", "resume");
  expect(Number.isFinite(theme.ms)).toBe(true);
  console.log(`[typst] cold resume ${cold.ms} ms · cover letter ${letter.ms} ms · theme re-render ${theme.ms} ms`);
  if (theme.ms > 300) console.warn(`[typst] theme re-render took ${theme.ms} ms (target under 300 ms)`);

  test.skip(!has("pdftotext") || !has("pdffonts"), "poppler-utils not installed");
  // Every font is embedded (pdffonts "emb" column).
  for (const f of [cold.file, letter.file]) {
    const fonts = execFileSync("pdffonts", [f], { encoding: "utf8" }).split("\n").slice(2).filter(Boolean);
    expect(fonts.length).toBeGreaterThan(0);
    for (const line of fonts) expect(line, line).toMatch(/\byes\b/);
  }

  // Selectable text in reading order, starting with the name.
  const resumeText = execFileSync("pdftotext", ["-layout", cold.file, "-"], { encoding: "utf8" });
  const lines = resumeText.split("\n").map((l) => l.trim()).filter(Boolean);
  expect(lines[0]).toBe("Jordan Whitlock");
  expect(lines[1]).toContain("Sydney NSW | 0412 345 678 | jordan.whitlock@example.com");
  const at = (s: string) => resumeText.indexOf(s);
  expect(at("Summary")).toBeGreaterThan(0);
  expect(at("Experience")).toBeGreaterThan(at("Summary"));
  expect(at("Skills")).toBeGreaterThan(at("Experience"));
  expect(execFileSync("pdftotext", [cold.file, "-"], { encoding: "utf8" }).replace(/\s+/g, " ")).toContain(
    "Designed an event-driven pricing service on AWS Lambda and SQS that handles 2M quotes a month"
  );

  const letterText = execFileSync("pdftotext", [letter.file, "-"], { encoding: "utf8" });
  expect(letterText.trim().startsWith("Jordan Whitlock")).toBe(true);
  expect(letterText.indexOf("Dear Hiring Manager,")).toBeGreaterThan(letterText.indexOf("Re: Senior Full Stack Engineer"));
  expect(letterText.indexOf("Kind regards,")).toBeGreaterThan(letterText.indexOf("Dear Hiring Manager,"));
});

test("two renders at once each get their own document", async ({ page }) => {
  test.skip(!has("pdftotext"), "poppler-utils not installed");
  await page.goto("/dev/render");
  await page.getByRole("button", { name: "Render both at once" }).click();
  await expect(renders(page)).toHaveCount(2, { timeout: 60_000 });
  for (const kind of ["resume", "coverLetter"]) {
    const row = page.locator(`li[data-kind=${kind}]`);
    const download = page.waitForEvent("download");
    await row.getByRole("link").click();
    const file = join(dir, `both-${kind}.pdf`);
    await (await download).saveAs(file);
    const text = execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
    expect(text.includes("Dear Hiring Manager,"), kind).toBe(kind === "coverLetter");
    expect(text.includes("Experience"), kind).toBe(kind === "resume");
  }
});

test.describe("lazy loading (AC4)", () => {
  async function track(page: Page) {
    const wasm: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith(".wasm")) wasm.push(r.url());
    });
    await page.addInitScript(() => {
      const w = window as unknown as { __workers: number };
      w.__workers = 0;
      const Orig = window.Worker;
      window.Worker = class extends Orig {
        constructor(...args: ConstructorParameters<typeof Worker>) {
          super(...args);
          w.__workers++;
        }
      };
    });
    return { wasm, workers: () => page.evaluate(() => (window as unknown as { __workers: number }).__workers) };
  }

  test("other pages never load the renderer", async ({ page }) => {
    const t = await track(page);
    for (const path of ["/dashboard", "/kb/roles", "/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await t.workers(), path).toBe(0);
    }
    expect(t.wasm).toEqual([]);
  });

  for (const path of ["/projects/sample", "/new/quick"]) {
    test(`${path} starts the worker and fetches the Typst WASM`, async ({ page }) => {
      const t = await track(page);
      const wasm = page.waitForRequest((r) => r.url().endsWith(".wasm"));
      await page.goto(path);
      await wasm;
      expect(await t.workers()).toBe(1);
    });
  }
});
