import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// The server runs on a seeded throwaway database (Jordan Whitlock, SPEC §17), never ./data.
const IR_DB_URL = `file:${join(tmpdir(), "ir-e2e.db")}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // Local fallback when Playwright's bundled browser can't run on this OS (e.g. PW_CHROMIUM=/usr/bin/chromium).
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Production build, so a prerendered page can't hide a missing CSP nonce.
  webServer: {
    command: "pnpm db:seed --force && pnpm build && pnpm start",
    url: `http://127.0.0.1:${PORT}/dashboard`,
    env: { PORT: String(PORT), IR_DEV_UI: "1", IR_DB_URL, NEXT_PUBLIC_LLM_MOCK: "1" }, // inlined at build: every e2e test runs on the mock provider
    reuseExistingServer: false, // always test a fresh production build
    timeout: 180_000,
  },
});
