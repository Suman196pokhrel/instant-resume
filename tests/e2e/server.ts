import { spawn, type ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "@playwright/test";

/**
 * Runs the spec file on its own production server with an empty database, for flows that need a first run or
 * change the knowledge base (the shared e2e server is seeded and shared by parallel files). Uses the build the
 * Playwright web server made. The file runs serially.
 */
export function runOnEmptyServer(port: number) {
  const db = join(tmpdir(), `ir-e2e-${port}.db`);
  let server: ChildProcess;
  test.describe.configure({ mode: "serial" });
  test.use({ baseURL: `http://127.0.0.1:${port}` });
  test.beforeAll(async () => {
    test.setTimeout(60_000);
    rmSync(db, { force: true });
    server = spawn("pnpm", ["start"], { env: { ...process.env, PORT: String(port), IR_DB_URL: `file:${db}`, IR_DEV_UI: "1" }, detached: true, stdio: "ignore" });
    for (let i = 0; i < 100; i++) {
      if (await fetch(`http://127.0.0.1:${port}/api/settings`).then((r) => r.ok, () => false)) return;
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`test server on ${port} did not start`);
  });
  test.afterAll(() => {
    if (server?.pid) process.kill(-server.pid, "SIGTERM"); // the whole group: pnpm and next-server
  });
}
