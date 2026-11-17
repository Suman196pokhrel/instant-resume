/* eslint-disable @typescript-eslint/no-explicit-any -- these tests break the fixture on purpose */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { openDb } from "@/lib/db/client";
import { readKb, writeKb } from "@/lib/db/kb";
import { documents, kbEntries, projects, revisions } from "@/lib/db/schema";
import { kbSchema } from "@/lib/schemas/kb";

// SPEC §7.1, §17: the db:migrate and db:seed scripts, run for real in a fresh directory.
const ROOT = join(__dirname, "../..");
const TSX = join(ROOT, "node_modules/.bin/tsx");
let dir: string;
const run = (script: string, ...args: string[]) => spawnSync(TSX, [join(ROOT, "lib/db", script), ...args], { cwd: dir, encoding: "utf8" });
const db = () => openDb(`file:${join(dir, "data/instant-resume.db")}`);

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "ir-db-"));
});

describe("db:migrate (AC1)", () => {
  it("creates ./data/instant-resume.db with every §7.1 table, and re-running is a no-op", async () => {
    const first = run("migrate.ts");
    expect(first.status, first.stderr).toBe(0);
    expect(existsSync(join(dir, "data/instant-resume.db"))).toBe(true);
    const tables = await db().all<{ name: string }>(sql`select name from sqlite_master where type = 'table' and name not like '%migrations%' and name not like 'sqlite_%' order by name`);
    expect(tables.map((t) => t.name)).toEqual(["documents", "kb_entries", "projects", "revisions", "settings"]);
    expect(run("migrate.ts").status).toBe(0);
  });
});

describe("db:seed (AC2)", () => {
  it("loads the synthetic KB, refuses to overwrite it, and replaces it with --force", async () => {
    const seeded = run("seed.ts");
    expect(seeded.status, seeded.stderr).toBe(0);
    expect(await readKb(db())).toEqual(kbSchema.parse(fixture));

    const again = run("seed.ts");
    expect(again.status).not.toBe(0);
    expect(again.stderr).toMatch(/--force/);

    await db().delete(kbEntries).where(sql`type = 'referee'`);
    expect(run("seed.ts", "--force").status).toBe(0);
    expect((await readKb(db()))?.referees).toHaveLength(2);
  });
});

describe("knowledge base storage (AC3, AC4)", () => {
  it("writeKb rejects an invalid KB and writes nothing", async () => {
    const before = await readKb(db());
    const bad = structuredClone(fixture) as Record<string, any>;
    delete bad.roles[0].highlights[0].text;
    await expect(writeKb(db(), bad)).rejects.toThrow();
    expect(await readKb(db())).toEqual(before);
  });

  it("readKb runs the migration hook: a row from a newer version is refused", async () => {
    await db().update(kbEntries).set({ schemaVersion: 99 }).where(sql`type = 'contact'`);
    await expect(readKb(db())).rejects.toThrow(/newer version/);
    await db().update(kbEntries).set({ schemaVersion: 1 }).where(sql`type = 'contact'`);
  });

  it("an empty database reads as no knowledge base", async () => {
    const empty = mkdtempSync(join(tmpdir(), "ir-db-empty-"));
    execFileSync(TSX, [join(ROOT, "lib/db/migrate.ts")], { cwd: empty });
    expect(await readKb(openDb(`file:${join(empty, "data/instant-resume.db")}`))).toBeNull();
  });

  it("deleting a project cascades to its documents and revisions", async () => {
    const d = db();
    const now = new Date().toISOString();
    await d.insert(projects).values({ id: "p-1", company: "Mintleaf", role: "Engineer", location: "Melbourne", jdText: "JD", brief: {}, selected: [], source: "quick", schemaVersion: 1, createdAt: now, updatedAt: now });
    await d.insert(documents).values({ id: "doc-1", projectId: "p-1", kind: "resume", content: { sections: [] }, theme: {}, updatedAt: now });
    await d.insert(revisions).values({ id: "rev-1", documentId: "doc-1", ts: now, kind: "generation", label: "Generated from job brief", snapshot: {} });
    await d.delete(projects).where(sql`id = 'p-1'`);
    expect(await d.select().from(documents)).toEqual([]);
    expect(await d.select().from(revisions)).toEqual([]);
  });
});
