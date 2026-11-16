import { spawn } from "node:child_process";
import { expect, test } from "@playwright/test";

/** Starts a server the way a user would and resolves with its exit code and output (null code = still running). */
function run(script: "dev" | "start", env: Record<string, string>, port: number) {
  return new Promise<{ code: number | null; output: string }>((resolve) => {
    const child = spawn("pnpm", [script], { env: { ...process.env, ...env, PORT: String(port) }, detached: true });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    const timer = setTimeout(() => {
      process.kill(-child.pid!, "SIGKILL"); // still running: the check didn't stop it
      resolve({ code: null, output });
    }, 60_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
}

// Uses the production build made by the Playwright web server.
for (const [script, port] of [["start", 3101], ["dev", 3102]] as const) {
  test(`pnpm ${script} refuses a non-loopback HOST without APP_PASSWORD (AC5)`, async () => {
    test.setTimeout(90_000);
    const { code, output } = await run(script, { HOST: "0.0.0.0", APP_PASSWORD: "" }, port);
    expect(code, output).not.toBe(0);
    expect(code, output).not.toBeNull();
    expect(output).toContain("Instant Resume did not start");
    expect(output).toContain("APP_PASSWORD");
  });
}
