import { expect, test, type Page } from "@playwright/test";

const SHELL_ROUTES: [path: string, h1: string][] = [
  ["/onboarding", "Build your knowledge base"],
  ["/import", "Import your resume"],
  ["/dashboard", "Applications"],
  ["/kb/roles", "Knowledge base"],
  ["/settings", "Settings"],
  ["/new", "New application"],
  ["/new/quick", "Paste a job description"],
  ["/new/studio", "Paste the job description"],
];

/** Collects console errors and CSP violations for the whole test. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("sidebar has exactly the three main destinations, styled with the tokens (AC1)", async ({ page }) => {
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(["Applications", "Knowledge base", "Settings"]);
  await expect(nav.getByRole("link", { name: "Applications" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Settings" })).not.toHaveAttribute("aria-current");
  const body = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { bg: s.backgroundColor, font: s.fontFamily };
  });
  expect(body.bg).toBe("rgb(243, 242, 238)"); // --bg #F3F2EE
  expect(body.font).toMatch(/Schibsted/i);
});

test("every route renders inside the right layout without errors (AC2, AC4)", async ({ page }) => {
  const errors = watchErrors(page);
  for (const [path, h1] of SHELL_ROUTES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(h1);
    await expect(page.locator("[data-shell]"), path).toHaveAttribute("data-shell", "full");
  }
  await page.goto("/projects/sample");
  await expect(page.locator("[data-shell]")).toHaveAttribute("data-shell", "compact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Workspace");

  await page.goto("/onboarding/manual");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact details");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);

  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(errors).toEqual([]);
});

test("unknown knowledge base sections are a 404 (AC2)", async ({ page }) => {
  const res = await page.goto("/kb/unknown");
  expect(res?.status()).toBe(404);
});

test("at phone width the nav becomes a bottom bar with no sideways scroll (AC2)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Main" });
  const box = await nav.boundingBox();
  expect(box!.y).toBeGreaterThan(700);
  // Icon-only links still need names for screen readers (SPEC §16).
  for (const name of ["Applications", "Knowledge base", "Settings"]) {
    await expect(nav.getByRole("link", { name }), name).toBeVisible();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBe(0);
});

test("pages carry a nonce-based CSP that allows only the provider hosts (AC4)", async ({ page }) => {
  const res = await page.goto("/dashboard");
  const csp = res!.headers()["content-security-policy"];
  const directive = (name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(name + " ")) ?? "";
  expect(directive("script-src")).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(directive("script-src")).not.toContain("'unsafe-inline'");
  expect(directive("script-src")).toContain("'wasm-unsafe-eval'");
  expect(directive("connect-src").split(" ").sort()).toEqual(
    ["connect-src", "'self'", "https://api.anthropic.com", "https://api.openai.com", "https://generativelanguage.googleapis.com"].sort(),
  );
  expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
  // Each request gets a fresh nonce.
  const again = (await page.request.get("/dashboard")).headers()["content-security-policy"];
  expect(again).not.toBe(csp);
});
