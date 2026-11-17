import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as lock } from "@/app/api/lock/route";
import { POST as unlock } from "@/app/api/unlock/route";
import { SESSION_MAX_AGE, signSession } from "@/lib/access/session";
import { proxy } from "@/proxy";

// SPEC §4.1, §18.3: the access gate (proxy.ts) and the unlock/lock route handlers.
const BASE = "http://app.test";
const PASSWORD = "correct horse battery";
let ip = 0;

function req(path: string, init: { method?: string; origin?: string | null; cookie?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const { method = "GET", origin = method === "GET" ? null : BASE, cookie, body } = init;
  const headers: Record<string, string> = { host: "app.test", ...init.headers };
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = `ir_session=${cookie}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const passes = (res: Response) => res.headers.get("x-middleware-next") === "1";

beforeAll(() => process.chdir(mkdtempSync(join(tmpdir(), "ir-access-"))));

describe("local only: APP_PASSWORD unset (AC1)", () => {
  beforeEach(() => {
    delete process.env.APP_PASSWORD;
  });

  it("no page or /api route asks for a session", async () => {
    expect(passes(await proxy(req("/kb/roles")))).toBe(true);
    expect(passes(await proxy(req("/api/kb")))).toBe(true);
    expect(passes(await proxy(req("/api/kb", { method: "POST" })))).toBe(true);
  });

  it("/unlock goes home and /api/unlock does not exist", async () => {
    const res = await proxy(req("/unlock"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    expect((await unlock(req("/api/unlock", { method: "POST", body: { password: PASSWORD } }))).status).toBe(404);
  });
});

describe("password lock (AC2–AC5)", () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = PASSWORD;
  });
  const login = (password: unknown, client: string) =>
    unlock(req("/api/unlock", { method: "POST", body: { password }, headers: { "x-forwarded-for": `198.51.100.9, ${client}` } }));

  it("AC2: pages redirect to /unlock keeping the URL; /api returns 401 locked; prefetches are gated", async () => {
    const page = await proxy(req("/kb/roles?tab=1"));
    expect(page.status).toBe(307);
    const to = new URL(page.headers.get("location")!, BASE);
    expect(to.pathname).toBe("/unlock");
    expect(to.searchParams.get("next")).toBe("/kb/roles?tab=1");

    const prefetch = await proxy(req("/kb/roles", { headers: { "next-router-prefetch": "1" } }));
    expect(prefetch.status).toBe(307);

    const api = await proxy(req("/api/kb"));
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: "locked" });

    expect(passes(await proxy(req("/unlock")))).toBe(true);
    expect(passes(await proxy(req("/api/unlock", { method: "POST" })))).toBe(true);
    expect((await proxy(req("/api/unlock"))).status).toBe(401);
  });

  it("AC3: parallel guesses can't get past the limit", async () => {
    const client = `203.0.113.${++ip}`;
    const codes = (await Promise.all(Array.from({ length: 12 }, () => login("wrong password!", client)))).map((r) => r.status);
    expect(codes.filter((c) => c === 401)).toHaveLength(5);
    expect(codes.filter((c) => c === 429)).toHaveLength(7);
  });

  it("redirects with a relative Location, so a reverse proxy's public host and scheme are kept", async () => {
    expect((await proxy(req("/kb/roles"))).headers.get("location")).toBe("/unlock?next=%2Fkb%2Froles");
  });

  it("AC3: wrong → 401, 6th attempt → 429; the right one sets the cookie and opens the page", async () => {
    const client = `203.0.113.${++ip}`;
    for (let i = 1; i <= 4; i++) {
      const res = await login("wrong password!", client);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "wrong_password" });
    }
    const fifth = await login("wrong password!", client);
    expect(fifth.status).toBe(401);
    expect((await fifth.json()).retryAfter).toBeGreaterThan(0);
    const sixth = await login(PASSWORD, client);
    expect(sixth.status).toBe(429);
    expect(Number(sixth.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await sixth.json()).toMatchObject({ error: "rate_limited" });

    const ok = await login(PASSWORD, `203.0.113.${++ip}`);
    expect(ok.status).toBe(200);
    const set = ok.headers.get("set-cookie")!;
    expect(set).toMatch(/^ir_session=\d+\.[\w-]+;/);
    for (const attr of ["HttpOnly", "Secure", "SameSite=strict", "Path=/", `Max-Age=${SESSION_MAX_AGE}`]) {
      expect(set.toLowerCase()).toContain(attr.toLowerCase());
    }
    const cookie = set.split(";")[0].split("=")[1];
    expect(passes(await proxy(req("/kb/roles", { cookie })))).toBe(true);
    expect(passes(await proxy(req("/api/kb", { cookie })))).toBe(true);
  });

  it("422 for a missing, empty, non-string or oversized password", async () => {
    for (const bad of [undefined, "", 42, "x".repeat(1025)]) {
      expect((await login(bad, `203.0.113.${++ip}`)).status).toBe(422);
    }
  });

  it("AC4: expired, tampered and old-password cookies are rejected; lock clears the cookie", async () => {
    const expired = await signSession(Date.now() - SESSION_MAX_AGE * 1000 - 1000);
    const good = await signSession();
    const tampered = good.replace(/^\d/, (d) => String((Number(d) + 1) % 10));
    for (const cookie of [expired, tampered]) expect((await proxy(req("/api/kb", { cookie }))).status).toBe(401);
    process.env.APP_PASSWORD = "a brand new password";
    expect((await proxy(req("/kb/roles", { cookie: good }))).status).toBe(307);

    expect(passes(await proxy(req("/api/lock", { method: "POST", cookie: await signSession() })))).toBe(true);
    const res = await lock();
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/^ir_session=;.*Max-Age=0/i);
  });

  it("AC5: a state-changing request needs our own Origin", async () => {
    const cookie = await signSession();
    expect((await proxy(req("/api/kb", { method: "POST", cookie, origin: "https://evil.example" }))).status).toBe(403);
    expect((await proxy(req("/api/kb", { method: "DELETE", cookie, origin: null }))).status).toBe(403);
    expect((await proxy(req("/api/unlock", { method: "POST", origin: "https://evil.example" }))).status).toBe(403);
    expect(passes(await proxy(req("/api/kb", { method: "PATCH", cookie })))).toBe(true);
    // Behind a reverse proxy the public host arrives as x-forwarded-host.
    const proxied = req("/api/kb", { method: "PUT", cookie, origin: "https://resume.example", headers: { "x-forwarded-host": "resume.example" } });
    expect(passes(await proxy(proxied))).toBe(true);
    expect(passes(await proxy(req("/api/kb", { cookie, origin: "https://evil.example" })))).toBe(true);
  });
});
