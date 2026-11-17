import { expect, test } from "@playwright/test";

// The production server reaches SQLite through the bundled route handlers (libSQL loads, migrations apply).
test("GET /api/settings answers with the AU defaults", async ({ request }) => {
  const res = await request.get("/api/settings");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ paper: "A4", spelling: "en-AU" });
});
