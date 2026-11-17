import { expect, test, type Locator, type Page } from "@playwright/test";

// TASK-33: form controls and overlays on /dev/ui (SPEC §11.5, §12, §16).
const scaleOf = (l: Locator) => l.evaluate((el) => { const s = getComputedStyle(el).scale; return s === "none" ? 1 : parseFloat(s); });
const box = async (l: Locator) => (await l.boundingBox())!;
const mid = async (l: Locator) => { await l.scrollIntoViewIfNeeded(); const b = await box(l); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const springy = (l: Locator) => l.evaluate((el) => getComputedStyle(el).transitionTimingFunction);
const settled = (l: Locator) => l.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)).then(() => true));

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/ui");
});

test.describe("segmented control and tabs (AC1)", () => {
  test("segmented thumb slides with the spring and arrow keys move the choice", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: "Page budget" });
    const thumb = group.locator("[data-slot=segmented-thumb]");
    expect(await springy(thumb)).toContain("linear(");
    const x0 = (await box(thumb)).x;
    await group.getByRole("radio", { name: "3 pages" }).click();
    await expect(group.getByRole("radio", { name: "3 pages" })).toBeChecked();
    await expect.poll(async () => (await box(thumb)).x).toBeGreaterThan(x0 + 50);

    await page.keyboard.press("ArrowLeft");
    const two = group.getByRole("radio", { name: "2 pages" });
    await expect(two).toBeChecked();
    await expect(two).toBeFocused();
    await settled(thumb);
    const t = await box(thumb), o = await box(two);
    expect(Math.abs(t.x + t.width / 2 - (o.x + o.width / 2))).toBeLessThan(3);
  });

  for (const [name, from, to] of [["Document", "Resume", "Cover letter"], ["Inspector", "Content", "Design"]] as const) {
    test(`${name} tabs slide their indicator and follow arrow keys`, async ({ page }) => {
      const list = page.getByRole("tablist", { name });
      const bar = list.locator("[data-slot=tabs-indicator]");
      expect(await springy(bar)).toContain("linear(");
      await list.getByRole("tab", { name: to }).click();
      await expect(list.getByRole("tab", { name: to })).toHaveAttribute("aria-selected", "true");
      await settled(bar);
      const b = await box(bar), t = await box(list.getByRole("tab", { name: to }));
      expect(Math.abs(b.x - t.x)).toBeLessThan(4);

      await list.getByRole("tab", { name: from }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator(":focus")).toHaveAttribute("role", "tab");
      await expect(page.locator(":focus")).not.toHaveText(from);
    });
  }
});

test.describe("switch, checkbox and slider (AC2)", () => {
  test("switch toggles with its On/Off text and Space", async ({ page }) => {
    const sw = page.getByRole("switch", { name: "Cover letter" });
    const row = page.locator("[data-slot=switch-field]").filter({ has: sw });
    await expect(sw).not.toBeChecked();
    await expect(row).toContainText("Off");
    await sw.click();
    await expect(sw).toBeChecked();
    await expect(row).toContainText("On");
    expect(await springy(sw.locator("[data-slot=switch-thumb]"))).toContain("linear(");
    await sw.focus();
    await page.keyboard.press("Space");
    await expect(sw).not.toBeChecked();
    const track = await box(sw);
    expect([Math.round(track.width), Math.round(track.height)]).toEqual([38, 22]);
  });

  test("checkbox presses to .86 with the spring and Space checks it", async ({ page }) => {
    const cb = page.getByRole("checkbox", { name: "Include referees" });
    expect(Math.round((await box(cb)).width)).toBe(18);
    const p = await mid(cb);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await expect.poll(() => scaleOf(cb)).toBeCloseTo(0.86, 2);
    await page.mouse.up();
    await expect.poll(() => scaleOf(cb)).toBeCloseTo(1, 2);
    await expect(cb).toBeChecked();
    await page.keyboard.press("Space");
    await expect(cb).not.toBeChecked();
  });

  test("slider shows its label and tabular value, and the fill follows the keys", async ({ page }) => {
    const slider = page.getByRole("slider", { name: "Font size" });
    const field = page.locator("[data-slot=slider]").filter({ has: slider });
    const out = field.locator("output");
    await expect(out).toHaveText("10.5 pt");
    expect(await out.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toContain("tabular-nums");
    const fill = field.locator("[data-slot=slider-range]");
    const w0 = (await box(fill)).width;
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(out).toHaveText("11 pt");
    expect((await box(fill)).width).toBeGreaterThan(w0);
  });
});

test.describe("disclosure (AC3)", () => {
  test("chevron turns 90° and the content fades in", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Job description" });
    const chevron = trigger.locator("svg");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = page.getByText("Senior product designer, Sydney");
    await expect(panel).toBeVisible();
    await expect.poll(() => chevron.evaluate((el) => getComputedStyle(el).rotate)).toBe("90deg");
    await page.keyboard.press("Enter");
    await expect(panel).toBeHidden();
  });

  test("content fades in", async ({ page }) => {
    // Record the panel's animations from the moment it mounts (the fade is only 180ms).
    await page.evaluate(() => {
      const w = window as unknown as { __fade: number[] };
      w.__fade = [];
      const poll = () => {
        const el = document.querySelector("[data-slot=collapsible-content]");
        if (el?.getAnimations().length) w.__fade.push(parseFloat(getComputedStyle(el).opacity));
        requestAnimationFrame(poll);
      };
      poll();
    });
    await page.getByRole("button", { name: "Job description" }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __fade: number[] }).__fade.some((o) => o < 1))).toBe(true);
  });
});

async function openDialog(page: Page, name: string) {
  const trigger = page.getByRole("button", { name, exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return { trigger, dialog };
}

test.describe("dialog (AC4)", () => {
  test("480px, traps focus, Escape closes and focus returns to the trigger", async ({ page }) => {
    const { trigger, dialog } = await openDialog(page, "Open dialog");
    await settled(dialog);
    expect(Math.round((await box(dialog)).width)).toBe(480);
    expect(await springy(dialog)).toContain("linear(");
    await expect(dialog.getByRole("heading", { name: "Delete application" })).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("wide variant is 720px; the backdrop fades and the panel springs in", async ({ page }) => {
    const { dialog } = await openDialog(page, "Open wide dialog");
    const backdrop = page.locator("[data-slot=dialog-overlay]");
    expect(await backdrop.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain("opacity");
    await settled(dialog);
    expect(Math.round((await box(dialog)).width)).toBe(720);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe("menu (AC5)", () => {
  test("uses menu/menuitemradio semantics and the keyboard", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Sort by" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitemradio", { name: "Newest" })).toHaveAttribute("aria-checked", "true");
    // Opening from the keyboard highlights the first item.
    await expect(menu.getByRole("menuitemradio", { name: "Newest" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitemradio", { name: "Oldest" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveCount(0);
    await trigger.click();
    await expect(page.getByRole("menuitemradio", { name: "Oldest" })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("pops with the spring from the corner nearest its button", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Sort by" });
    await trigger.click();
    const menu = page.getByRole("menu");
    expect(await menu.evaluate((el) => getComputedStyle(el).animationTimingFunction)).toContain("linear(");
    const [ox, oy] = (await menu.evaluate((el) => getComputedStyle(el).transformOrigin)).split(" ").map(parseFloat);
    const m = await box(menu), t = await box(trigger);
    // Button sits above the menu's right edge (align end): origin is the top-right corner.
    expect(oy).toBeLessThanOrEqual(0);
    expect(Math.abs(m.x + ox - (t.x + t.width))).toBeLessThan(t.width);
  });
});

test.describe("reduced motion (AC5)", () => {
  test.use({ reducedMotion: "reduce" });

  test("thumbs, underlines and the dialog swap instantly", async ({ page }) => {
    const dur = (l: Locator) => l.evaluate((el) => Math.max(...getComputedStyle(el).transitionDuration.split(",").map(parseFloat)));
    expect(await dur(page.locator("[data-slot=segmented-thumb]").first())).toBeLessThan(0.001);
    expect(await dur(page.locator("[data-slot=tabs-indicator]").first())).toBeLessThan(0.001);
    const { dialog } = await openDialog(page, "Open dialog");
    expect(await dur(dialog)).toBeLessThan(0.001);
  });
});
