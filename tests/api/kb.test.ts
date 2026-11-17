/* eslint-disable @typescript-eslint/no-explicit-any -- response bodies are inspected loosely */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import * as kb from "@/app/api/kb/route";
import * as contact from "@/app/api/kb/contact/route";
import * as workRights from "@/app/api/kb/work-rights/route";
import * as entries from "@/app/api/kb/[type]/route";
import * as entry from "@/app/api/kb/[type]/[id]/route";
import * as settings from "@/app/api/settings/route";
import { getDb } from "@/lib/db/client";
import { writeKb } from "@/lib/db/kb";

// SPEC §7.2 knowledge base and settings routes, §18.3.
const req = (method: string, body?: unknown, raw?: string) =>
  new NextRequest("http://app.test/api/x", { method, headers: { "content-type": "application/json" }, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) }) as any;
const body = async (res: Response) => (res.status === 204 ? null : res.json());
const getKb = async () => body(await kb.GET());

/** Every key name anywhere in a JSON value. */
const keysOf = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap(keysOf) : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...keysOf(x)]) : [];
const SECRET = { apiKey: "sk-ant-secret", key: "k", connection: { provider: "anthropic", apiKey: "sk-x" } };
const noSecrets = (v: unknown) => expect(keysOf(v).filter((k) => ["apiKey", "key", "connection", "connections"].includes(k))).toEqual([]);

beforeAll(() => {
  process.chdir(mkdtempSync(join(tmpdir(), "ir-kb-")));
});

describe("before a knowledge base exists", () => {
  it("getDb creates the tables without db:migrate; GET is null and changes are 409", async () => {
    const tables = await (await getDb()).all<{ name: string }>(sql`select name from sqlite_master where name = 'kb_entries'`);
    expect(tables).toHaveLength(1);
    expect(await getKb()).toBeNull();
    const res = await entries.POST(req("POST", { title: "x" }), ctx({ type: "roles" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "no_knowledge_base" });
  });
});

describe("knowledge base routes (AC3)", () => {
  beforeAll(async () => {
    await writeKb(await getDb(), fixture);
  });

  it("GET returns the KB", async () => {
    const data = await getKb();
    expect(data.contact.name).toBe("Jordan Whitlock");
    expect(data.roles).toHaveLength(3);
  });

  it("PUT contact and work rights replace them and keep their ids", async () => {
    const res = await contact.PUT(req("PUT", { ...fixture.contact, id: "something-else", name: "Jordan W.", ...SECRET }));
    expect(res.status).toBe(200);
    noSecrets(await res.json());
    expect((await getKb()).contact).toMatchObject({ id: "kb-contact", name: "Jordan W." });
    expect((await workRights.PUT(req("PUT", { status: "Permanent resident" }))).status).toBe(200);
    expect((await getKb()).workRights).toEqual({ id: "kb-rights", status: "Permanent resident" });
  });

  it("POST appends an entry with generated ids", async () => {
    const res = await entries.POST(
      req("POST", { title: "Tech Lead", company: "Harbourline", start: "Jan 2025", end: "Present", highlights: [{ text: "Led a team of five", skills: [], ...SECRET }], ...SECRET }),
      ctx({ type: "roles" })
    );
    expect(res.status).toBe(201);
    const created = await res.json();
    noSecrets(created);
    expect(created.id).toMatch(/^role-[0-9a-f]{8}$/);
    expect(created.highlights[0].id).toMatch(/^hl-[0-9a-f]{8}$/);
    const roles = (await getKb()).roles;
    expect(roles.at(-1)).toEqual(created);
  });

  it("PATCH merges fields and keeps the id; DELETE removes the entry", async () => {
    const res = await entry.PATCH(req("PATCH", { title: "Staff Software Engineer", id: "role-hacked", ...SECRET }), ctx({ type: "roles", id: "role-brightwater" }));
    expect(res.status).toBe(200);
    const role = (await getKb()).roles.find((r: any) => r.id === "role-brightwater");
    expect(role.title).toBe("Staff Software Engineer");
    expect(role.highlights).toHaveLength(6);

    expect((await entry.DELETE(req("DELETE"), ctx({ type: "referees", id: "ref-sam" }))).status).toBe(204);
    expect((await getKb()).referees.map((r: any) => r.id)).toEqual(["ref-dana"]);
  });

  it("PATCH fills the id of a newly added highlight", async () => {
    const civic = (await getKb()).roles.find((r: any) => r.id === "role-civic");
    const res = await entry.PATCH(req("PATCH", { highlights: [...civic.highlights, { text: "Ran the data portal's on-call roster", skills: [] }] }), ctx({ type: "roles", id: "role-civic" }));
    expect(res.status).toBe(200);
    const added = (await res.json()).highlights.at(-1);
    expect(added.id).toMatch(/^hl-[0-9a-f]{8}$/);
  });

  it("404 for an unknown type or a missing entry", async () => {
    expect((await entries.POST(req("POST", {}), ctx({ type: "hobbies" }))).status).toBe(404);
    expect((await entry.PATCH(req("PATCH", { title: "x" }), ctx({ type: "roles", id: "role-nope" }))).status).toBe(404);
    expect((await entry.DELETE(req("DELETE"), ctx({ type: "roles", id: "role-nope" }))).status).toBe(404);
    // An existing id under the wrong type is not found either.
    expect((await entry.DELETE(req("DELETE"), ctx({ type: "education", id: "role-mosaic" }))).status).toBe(404);
  });

  it("422 with field paths for invalid bodies and duplicate ids, and nothing is saved", async () => {
    const before = await getKb();
    const missingTitle = await entries.POST(req("POST", { company: "X", start: "2020", end: "2021", highlights: [] }), ctx({ type: "roles" }));
    expect(missingTitle.status).toBe(422);
    const { error, issues } = await missingTitle.json();
    expect(error).toBe("invalid");
    expect(issues).toContainEqual(expect.objectContaining({ path: expect.stringMatching(/^roles\.\d+\.title$/) }));

    const emptyText = await entry.PATCH(req("PATCH", { highlights: [{ id: "hl-x", text: " ", skills: [] }] }), ctx({ type: "roles", id: "role-civic" }));
    expect(emptyText.status).toBe(422);

    const dup = await entries.POST(req("POST", { name: "Side project", summary: "S", highlights: [{ id: "hl-bw-1", text: "Copy", skills: [] }] }), ctx({ type: "portfolio" }));
    expect(dup.status).toBe(422);
    expect((await dup.json()).issues[0].message).toMatch(/hl-bw-1/);

    expect((await contact.PUT(req("PUT", undefined, "{not json"))).status).toBe(422);
    expect(await getKb()).toEqual(before);
  });
});

describe("settings (AC4)", () => {
  it("GET fills the AU defaults; PUT saves and keeps the other defaults; invalid is 422", async () => {
    expect(await body(await settings.GET())).toMatchObject({ paper: "A4", spelling: "en-AU", quick: { theme: "classic", pages: 2 } });
    const res = await settings.PUT(req("PUT", { paper: "Letter", ...SECRET }));
    expect(res.status).toBe(200);
    noSecrets(await res.json());
    const saved = await body(await settings.GET());
    expect(saved).toMatchObject({ paper: "Letter", spelling: "en-AU", quick: { coverLetter: true } });
    noSecrets(saved);
    expect((await settings.PUT(req("PUT", { paper: "A3" }))).status).toBe(422);
  });
});

describe("no key fields reach the database (AC2)", () => {
  it("a deep scan of the stored rows finds none", async () => {
    const rows = await (await getDb()).all<{ data: string }>(sql`select data from kb_entries union all select value from settings`);
    noSecrets(rows.map((r) => JSON.parse(r.data)));
  });
});
