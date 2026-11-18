import { expect, test } from "@playwright/test";
import { runOnEmptyServer } from "./server";

// SPEC §13.1 empty state (TASK-14 AC2), on its own empty database.
runOnEmptyServer(3105);

test("with no applications, the dashed box offers a New application (AC2)", async ({ page }) => {
  await page.goto("/dashboard");
  const empty = page.locator("[data-slot=empty-state]");
  await expect(empty.getByRole("heading", { name: "No applications yet" })).toBeVisible();
  await expect(empty).toContainText("An application holds the job description, your tailored resume and your cover letter for one job.");
  await expect(empty.getByRole("link", { name: "New application" })).toHaveAttribute("href", "/new");
  await expect(page.getByRole("searchbox", { name: "Search applications" })).toBeVisible();
});
