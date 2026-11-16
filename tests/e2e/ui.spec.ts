import { expect, test, type Locator, type Page } from "@playwright/test";

const tip = (page: Page, text: string) => page.getByRole("tooltip").filter({ hasText: text });
// Tailwind v4 scale-* utilities set the CSS `scale` property, not `transform`.
const scaleOf = (l: Locator) => l.evaluate((el) => { const s = getComputedStyle(el).scale; return s === "none" ? 1 : parseFloat(s); });
const mid = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

/** Moves the pointer onto `trigger` and returns ms until its tooltip (by text) appeared, timed inside the page. */
async function openDelay(page: Page, trigger: Locator, text: string) {
  const p = await mid(trigger);
  const t0 = await page.evaluate((text) => {
    const w = window as unknown as { __tipAt?: number };
    w.__tipAt = undefined;
    const done = () =>
      [...document.querySelectorAll('[role="tooltip"]')].some((el) => el.textContent?.includes(text)) && (w.__tipAt ??= performance.now());
    new MutationObserver(done).observe(document.body, { childList: true, subtree: true });
    return performance.now();
  }, text);
  await page.mouse.move(p.x, p.y);
  await expect(tip(page, text)).toBeVisible({ timeout: 600 });
  return (await page.evaluate(() => (window as unknown as { __tipAt: number }).__tipAt)) - t0;
}

test.describe("buttons (AC1, AC4)", () => {
  test("press scales with the spring and springs back", async ({ page }) => {
    await page.goto("/dev/ui");
    const primary = page.getByRole("button", { name: "Primary", exact: true });
    expect(await primary.evaluate((el) => getComputedStyle(el).transitionTimingFunction)).toContain("linear(");
    const p = await mid(primary);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await expect.poll(() => scaleOf(primary)).toBeCloseTo(0.97, 2);
    await page.mouse.up();
    await expect.poll(() => scaleOf(primary)).toBeCloseTo(1, 2);

    const icon = page.getByRole("button", { name: "Undo" });
    const i = await mid(icon);
    await page.mouse.move(i.x, i.y);
    await page.mouse.down();
    await expect.poll(() => scaleOf(icon)).toBeCloseTo(0.9, 2);
    await page.mouse.up();
  });
});

test.describe("tooltips (AC2)", () => {
  test("show after 150ms, instantly within the warm window, and close on press, Escape and scroll", async ({ page }) => {
    await page.goto("/dev/ui");
    const a = page.getByRole("button", { name: "Tooltip A", exact: true });
    const b = page.getByRole("button", { name: "Tooltip B", exact: true });

    const first = await openDelay(page, a, "Tooltip A text");
    expect(first).toBeGreaterThan(130);
    expect(first).toBeLessThan(400);
    await expect(tip(page, "Tooltip A text")).toContainText("Title");

    // Never takes pointer events: the point under the tooltip resolves to the page, not the popup.
    const c = await mid(tip(page, "Tooltip A text"));
    expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[role="tooltip"]'), c)).toBe(false);

    // Warm window: the next trigger opens at once.
    expect(await openDelay(page, b, "Tooltip B text")).toBeLessThan(80);
    await expect(tip(page, "Tooltip B text")).toBeVisible();

    // Pressing closes it; it leaves with shadcn's short built-in fade (owner rule), never taking clicks.
    await page.mouse.down();
    await page.mouse.up();
    await expect(tip(page, "Tooltip B text")).toHaveCount(0, { timeout: 400 });

    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await a.hover();
    await expect(tip(page, "Tooltip A text")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip(page, "Tooltip A text")).toHaveCount(0, { timeout: 400 });

    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await b.hover();
    await expect(tip(page, "Tooltip B text")).toBeVisible();
    await page.mouse.wheel(0, 200);
    await expect(tip(page, "Tooltip B text")).toHaveCount(0, { timeout: 400 });
  });

  test("keyboard focus shows the tooltip", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Tooltip A", exact: true }).focus();
    await expect(tip(page, "Tooltip A text")).toBeVisible({ timeout: 400 });
  });

  test("compact sidebar icons have tooltips on the right", async ({ page }) => {
    await page.goto("/projects/sample");
    const link = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Settings" });
    await link.hover();
    const t = tip(page, "Settings");
    await expect(t).toBeVisible();
    expect((await t.boundingBox())!.x).toBeGreaterThan((await link.boundingBox())!.x + (await link.boundingBox())!.width);
  });
});

test.describe("toasts (AC4)", () => {
  const toast = (page: Page) => page.locator("[data-sonner-toast]");

  test("appear bottom-centre on ink and dismiss after 3.2s", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Show toast", exact: true }).click();
    await expect(toast(page)).toContainText("Saved to knowledge base");
    const box = (await toast(page).boundingBox())!;
    const vp = page.viewportSize()!;
    expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThan(12);
    expect(vp.height - (box.y + box.height)).toBeLessThan(60);
    expect(await toast(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(26, 35, 32)");
    await page.waitForTimeout(2500);
    await expect(toast(page)).toBeVisible();
    await expect(toast(page)).toHaveCount(0, { timeout: 2000 });
  });

  test("with an action they stay 6s; the error variant is red", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Show toast with action" }).click();
    await expect(toast(page).getByRole("button", { name: "Undo" })).toBeVisible();
    await page.waitForTimeout(4500);
    await expect(toast(page)).toBeVisible();

    await page.getByRole("button", { name: "Show error toast" }).click();
    const err = toast(page).filter({ hasText: "Something went wrong" });
    await expect(err).toBeVisible();
    expect(await err.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(180, 35, 24)");
  });
});

test.describe("view transitions (AC5)", () => {
  test.beforeEach(async ({ page }) => {
    // Record every view transition and its types (React passes { update, types }).
    await page.addInitScript(() => {
      const w = window as unknown as { __vt: string[][] };
      w.__vt = [];
      const orig = document.startViewTransition?.bind(document);
      if (!orig) return;
      document.startViewTransition = ((arg: unknown) => {
        w.__vt.push(typeof arg === "object" && arg && "types" in arg ? [...((arg as { types?: string[] }).types ?? [])] : []);
        return orig(arg as never);
      }) as typeof document.startViewTransition;
    });
  });
  const calls = (page: Page) => page.evaluate(() => (window as unknown as { __vt: string[][] }).__vt);

  test("page changes transition, the sidebar is named, and clicks pass through", async ({ page }) => {
    await page.goto("/dashboard");
    expect(await page.locator("aside").evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe("sidebar");
    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: "Knowledge base" }).click();
    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");
    expect((await calls(page)).length).toBeGreaterThan(0);
  });

  test("step changes carry their direction", async ({ page }) => {
    await page.goto("/dev/ui");
    // Record the view-transition animations that actually run (the slide keyframes from globals.css).
    await page.evaluate(() => {
      const w = window as unknown as { __anims: string[] };
      w.__anims = [];
      const poll = () => {
        for (const a of document.getAnimations()) if (a instanceof CSSAnimation) w.__anims.push(a.animationName);
        requestAnimationFrame(poll);
      };
      poll();
    });
    await page.getByRole("button", { name: "Next step" }).click();
    await expect(page.getByRole("heading", { name: "Step 2" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __anims: string[] }).__anims)).toEqual(
      expect.arrayContaining(["vt-in-right", "vt-out-left"]),
    );
    await page.getByRole("button", { name: "Previous step" }).click();
    await expect(page.getByRole("heading", { name: "Step 1" })).toBeVisible();
    const types = (await calls(page)).flat();
    expect(types).toContain("forward");
    expect(types).toContain("back");
  });
});

test.describe("reduced motion (AC3)", () => {
  test.use({ reducedMotion: "reduce" });

  test("transitions are instant and navigation still works", async ({ page }) => {
    await page.goto("/dev/ui");
    const primary = page.getByRole("button", { name: "Primary", exact: true });
    expect(await primary.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.001);
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");
  });

  test("the gallery lists every shared component", async ({ page }) => {
    await page.goto("/dev/ui");
    for (const name of ["Buttons", "Tooltips", "Toasts", "Transitions"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
  });
});
