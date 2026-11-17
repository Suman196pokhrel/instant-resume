import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { checkPassword, SESSION_MAX_AGE, signSession, verifySession } from "../../lib/access/session";
import { rateLimiter } from "../../lib/access/rate-limit";
import { safeNext } from "../../lib/access/safe-next";

// SPEC §4.1 / §18.1 Access.
const PASSWORD = "correct horse battery";

beforeAll(() => process.chdir(mkdtempSync(join(tmpdir(), "ir-session-"))));
afterEach(() => {
  process.env.APP_PASSWORD = PASSWORD;
});

describe("session", () => {
  it("creates the secret once, private to the owner, and reuses it", async () => {
    process.env.APP_PASSWORD = PASSWORD;
    await signSession();
    const file = join(process.cwd(), "data", "session-secret");
    const first = readFileSync(file);
    expect(first).toHaveLength(32);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    await signSession();
    expect(readFileSync(file).equals(first)).toBe(true);
  });

  it("round-trips and rejects expired, tampered and malformed cookies", async () => {
    process.env.APP_PASSWORD = PASSWORD;
    const now = Date.now();
    const cookie = await signSession(now);
    expect(await verifySession(cookie, now)).toBe(true);
    expect(await verifySession(cookie, now + SESSION_MAX_AGE * 1000 + 1)).toBe(false);
    const [exp, sig] = cookie.split(".");
    expect(await verifySession(`${Number(exp) + 1}.${sig}`, now)).toBe(false);
    const tampered = sig.slice(0, -3) + (sig.at(-3) === "A" ? "B" : "A") + sig.slice(-2); // always differs from sig
    expect(await verifySession(`${exp}.${tampered}`, now)).toBe(false);
    for (const bad of [undefined, "", "abc", `${exp}`, `${exp}.${sig}.x`, `x${exp}.${sig}`]) {
      expect(await verifySession(bad, now)).toBe(false);
    }
  });

  it("rejects a cookie signed before a password change", async () => {
    process.env.APP_PASSWORD = PASSWORD;
    const cookie = await signSession();
    process.env.APP_PASSWORD = "a different password";
    expect(await verifySession(cookie)).toBe(false);
  });

  it("is never valid without a password", async () => {
    process.env.APP_PASSWORD = PASSWORD;
    const cookie = await signSession();
    delete process.env.APP_PASSWORD;
    expect(await verifySession(cookie)).toBe(false);
  });

  it("checks the password", async () => {
    process.env.APP_PASSWORD = PASSWORD;
    expect(await checkPassword(PASSWORD)).toBe(true);
    expect(await checkPassword("wrong password!")).toBe(false);
    expect(await checkPassword("")).toBe(false);
  });
});

describe("rate limiter", () => {
  it("allows 5 failures a minute per client, then resets", () => {
    const limit = rateLimiter();
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) expect(limit.fail("a", t)).toBe(0);
    expect(limit.retryAfter("a", t)).toBe(0);
    expect(limit.fail("a", t + 10_000)).toBe(50);
    expect(limit.retryAfter("a", t + 10_000)).toBe(50);
    expect(limit.retryAfter("b", t + 10_000)).toBe(0);
    expect(limit.retryAfter("a", t + 60_000)).toBe(0);
    limit.fail("c", t);
    limit.clear("c");
    expect(limit.fail("c", t)).toBe(0);
  });
});

describe("safeNext", () => {
  it.each([
    ["/kb/roles", "/kb/roles"],
    ["/projects/1?tab=checks#x", "/projects/1?tab=checks#x"],
    [null, "/dashboard"],
    ["", "/dashboard"],
    ["//evil.example", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["/\t/evil.example", "/dashboard"],
    ["https://evil.example/", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    ["kb", "/dashboard"],
  ])("%s → %s", (input, out) => {
    expect(safeNext(input)).toBe(out);
  });
});
