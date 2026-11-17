/* eslint-disable @typescript-eslint/no-explicit-any -- response bodies are inspected loosely */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import * as onboarding from "@/app/api/onboarding/route";
import * as complete from "@/app/api/onboarding/complete/route";
import { getDb } from "@/lib/db/client";
import { readKb, writeKb } from "@/lib/db/kb";
import { projects } from "@/lib/db/schema";

// SPEC §7.2 onboarding routes, §14.1, §18.3 (merge and replace).
const req = (method: string, body?: unknown) =>
  new NextRequest("http://app.test/api/onboarding", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const get = async () => (await onboarding.GET()).json();
const put = (state: unknown) => onboarding.PUT(req("PUT", state));
const finish = (mode: "merge" | "replace") => complete.POST(req("POST", { mode }));

const CONTACT = { name: "Riley Ng", email: "riley@example.com", location: "Hobart TAS" };
const VOLUNTEER = { title: "Mentor", company: "Code Club", highlights: [{ text: "Ran weekly sessions for 20 students", metric: "", skills: [] }] };
const state = (draft: Record<string, unknown>, over: Record<string, unknown> = {}) => ({ step: 3, maxStep: 3, draft, completed: false, saveMode: "merge", ...over });

beforeAll(() => {
  process.chdir(mkdtempSync(join(tmpdir(), "ir-onboarding-")));
});

describe("progress (AC1)", () => {
  it("GET starts at step 0 with an empty draft", async () => {
    expect(await get()).toEqual({ step: 0, maxStep: 0, draft: {}, completed: false, saveMode: "merge" });
  });

  it("PUT keeps a half-filled contact, fills entry and highlight IDs, and clamps the step", async () => {
    const res = await put(state({ contact: { name: "Riley" }, volunteering: [VOLUNTEER] }, { step: 40, maxStep: 40 }));
    expect(res.status).toBe(200);
    const saved = await get();
    expect(saved.step).toBe(10);
    expect(saved.maxStep).toBe(10);
    expect(saved.draft.contact).toEqual({ name: "Riley" });
    expect(saved.draft.volunteering[0].id).toMatch(/^vol-/);
    expect(saved.draft.volunteering[0].highlights[0].id).toMatch(/^hl-/);
    // Saving again keeps the IDs it was given.
    await put(saved);
    expect((await get()).draft.volunteering[0].id).toBe(saved.draft.volunteering[0].id);
  });

  it("PUT rejects an invalid body with 422 and keeps the saved state", async () => {
    const before = await get();
    expect((await put(state({ roles: [{ title: 42 }] }))).status).toBe(422); // drafts may be incomplete, not malformed
    expect((await put({ step: "two" })).status).toBe(422);
    expect(await get()).toEqual(before);
  });
});

describe("complete (AC2, AC3)", () => {
  it("needs a valid contact", async () => {
    await put(state({ contact: { name: "Riley", email: "nope" } }));
    const res = await finish("merge");
    expect(res.status).toBe(422);
    expect(await readKb(await getDb())).toBeNull();
  });

  it("saves a volunteer-only background without work rights into an empty KB", async () => {
    await put(state({ contact: CONTACT, volunteering: [VOLUNTEER] }));
    const res = await finish("merge");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ added: 2 });
    const kb = (await readKb(await getDb()))!;
    expect(kb.contact).toMatchObject(CONTACT);
    expect(kb.workRights).toBeUndefined();
    expect(kb.roles).toEqual([]);
    expect(kb.volunteering.map((v) => v.title)).toEqual(["Mentor"]);
    expect(await get()).toEqual({ step: 0, maxStep: 0, draft: {}, completed: true, saveMode: "merge" });
  });

  it("merge keeps the existing contact and work rights, adds new entries and skips existing IDs", async () => {
    const db = await getDb();
    await writeKb(db, fixture);
    await db.insert(projects).values({ id: "p-keep", company: "Mintleaf", role: "Engineer", location: "", jdText: "", brief: {}, selected: [], source: "studio", schemaVersion: 1, createdAt: "", updatedAt: "" } as any);
    await put(state({ contact: CONTACT, workRights: { status: "Permanent resident" }, roles: [fixture.roles[0], { title: "Tutor", company: "Uni", start: "2014", end: "2015", highlights: [] }] }));
    const res = await finish("merge");
    expect(await res.json()).toEqual({ added: 1 });
    const kb = (await readKb(db))!;
    expect(kb.contact.name).toBe("Jordan Whitlock");
    expect(kb.workRights?.status).toBe("Australian citizen");
    expect(kb.roles.map((r) => r.id)).toEqual(["role-brightwater", "role-mosaic", "role-civic", expect.stringMatching(/^role-/)]);
    expect(kb.skills).toHaveLength(4);
    expect((await db.all<{ n: number }>(sql`select count(*) as n from projects`))[0].n).toBe(1);
  });

  it("replace swaps the knowledge base for the draft and leaves projects alone", async () => {
    await put(state({ contact: CONTACT, volunteering: [VOLUNTEER] }));
    const res = await finish("replace");
    expect(await res.json()).toEqual({ added: 2 });
    const db = await getDb();
    const kb = (await readKb(db))!;
    expect(kb.contact.name).toBe("Riley Ng");
    expect(kb.workRights).toBeUndefined();
    expect(kb.roles).toEqual([]);
    expect(kb.skills).toEqual([]);
    expect(kb.volunteering).toHaveLength(1);
    expect((await db.all<{ n: number }>(sql`select count(*) as n from projects`))[0].n).toBe(1);
  });

  it("merge takes the draft's work rights when the KB has none", async () => {
    // The previous test left a KB without work rights.
    await put(state({ contact: CONTACT, workRights: { status: "Requires sponsorship", noticePeriod: "2 weeks" } }));
    expect(await (await finish("merge")).json()).toEqual({ added: 1 });
    expect((await readKb(await getDb()))!.workRights).toEqual({ id: "kb-rights", status: "Requires sponsorship", noticePeriod: "2 weeks" });
  });

  it("keeps an imported entry with missing details in the draft, but won't save it until it's fixed", async () => {
    const role = { title: "Support Engineer", company: "Harbour Health", highlights: [{ text: "Answered 40 tickets a day", skills: [] }] };
    expect((await put(state({ contact: CONTACT, roles: [role] }, { imported: "Pasted resume text" }))).status).toBe(200);
    const saved = await get();
    expect(saved.imported).toBe("Pasted resume text");
    expect((await finish("replace")).status).toBe(422);
    expect((await readKb(await getDb()))!.contact.name).toBe("Riley Ng"); // unchanged
    saved.draft.roles[0] = { ...saved.draft.roles[0], start: "2015", end: "2016" };
    await put(saved);
    expect((await finish("replace")).status).toBe(200);
  });

  it("rejects an unknown mode", async () => {
    expect((await complete.POST(req("POST", { mode: "overwrite" }))).status).toBe(422);
  });
});
