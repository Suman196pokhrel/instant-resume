import { expect, test, type Page } from "@playwright/test";
import { runOnEmptyServer } from "./server";

// SPEC §4.1, §13.3 Access and the unlock screen, §18.4 #16 (TASK-28): a seeded server started with APP_PASSWORD.
const PASSWORD = "correct horse battery";
runOnEmptyServer(3110, { env: { APP_PASSWORD: PASSWORD }, seed: true });

let client = 0;
// The unlock rate limit is per client and in memory, so each test is its own client.
test.beforeEach(({ page }) => page.setExtraHTTPHeaders({ "x-forwarded-for": `10.0.0.${++client}` }));

const field = (page: Page) => page.getByLabel("Password");
const alert = (page: Page) => page.locator("form").getByRole("alert"); // Next.js has its own route announcer alert
const unlockButton = (page: Page) => page.getByRole("button", { name: "Unlock" });

test("a locked page shows the unlock screen; empty and wrong passwords show their errors (AC1)", async ({ page }) => {
  await page.goto("/kb/roles");
  await expect(page).toHaveURL(/\/unlock\?next=%2Fkb%2Froles/);
  await expect(page.getByRole("heading", { name: "Unlock Instant Resume" })).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveAttribute("autocomplete", "current-password");
  await unlockButton(page).click();
  await expect(alert(page)).toHaveText("Enter the password");
  await field(page).fill("not the password");
  await expect(alert(page)).toHaveCount(0); // typing clears it
  await field(page).press("Enter");
  await expect(alert(page)).toHaveText("That password isn't right.");
  expect(await field(page).evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, "not the password".length]);
  await page.getByRole("button", { name: "Show" }).click();
  await expect(field(page)).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide" }).click();
  await expect(field(page)).toHaveAttribute("type", "password");
});

test("the 5th failure shows a countdown with Unlock disabled (AC2)", async ({ page }) => {
  await page.goto("/unlock");
  for (let i = 1; i <= 5; i++) {
    await field(page).fill(`wrong ${i}`);
    await unlockButton(page).click();
    if (i < 5) await expect(alert(page)).toHaveText("That password isn't right.");
  }
  await expect(alert(page)).toHaveText(/^Too many attempts\. Try again in \d+ seconds?\.$/);
  await expect(unlockButton(page)).toBeDisabled();
  const first = await alert(page).textContent();
  await expect(alert(page)).not.toHaveText(first!, { timeout: 3000 }); // it counts down
});

test("the right password lands on the requested page (AC3)", async ({ page }) => {
  await page.goto("/kb/roles");
  await field(page).fill(PASSWORD);
  await unlockButton(page).click();
  await expect(page).toHaveURL(/\/kb\/roles$/);
  await expect(page.getByText("Unlocked on this device")).toBeVisible();
  await expect(page.getByText("Stored on your server")).toBeVisible();
});

test("Settings → Access shows the lock is on, and Lock now returns to the unlock screen (AC4)", async ({ page }) => {
  await page.goto("/unlock?next=/settings");
  await field(page).fill(PASSWORD);
  await field(page).press("Enter");
  await expect(page).toHaveURL(/\/settings$/);
  const access = page.locator("section").filter({ has: page.getByRole("heading", { name: "Access" }) });
  await expect(access).toContainText("Password lock is on");
  await expect(access).toContainText("Protected");
  await access.getByRole("button", { name: "Lock now" }).click();
  await expect(page.getByRole("heading", { name: "Unlock Instant Resume" })).toBeVisible();
  await expect(page.getByText("Locked. Enter the password to continue.")).toBeVisible();
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/unlock/);
});
