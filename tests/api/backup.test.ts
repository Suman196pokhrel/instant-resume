import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import * as backup from "@/app/api/backup/route";
import { getDb } from "@/lib/db/client";
import { writeKb } from "@/lib/db/kb";
import { createProject, deleteProject, listProjects } from "@/lib/db/projects";
import { readPrefs } from "@/lib/db/settings";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";

// SPEC §14.6 Backup, §18.3, §18.4 #11 (TASK-27).
const exported = async () => (await backup.GET()).json();
const restore = (body: unknown) =>
  backup.POST(new NextRequest("http://app.test/api/backup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const theme = THEME_DEFAULTS;
const project = (company: string) => ({
  project: { company, role: "Engineer", location: "Adelaide SA", jdText: "A job", brief: { title: "Engineer", company, location: "Adelaide SA", seniority: "Mid-level", requirements: ["TypeScript"], niceToHave: [], keywords: ["TypeScript"], workRights: "Not stated" }, selected: [], source: "studio" },
  documents: [{ kind: "resume", theme, sections: [{ id: "s1", kind: "summary", title: "Summary", hidden: false, text: "Builds things." }] }],
});

/** Every object key anywhere in the value. */
const keysOf = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap(keysOf) : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...keysOf(x)]) : []);

beforeAll(async () => {
  process.chdir(mkdtempSync(join(tmpdir(), "ir-backup-")));
  const db = await getDb();
  await writeKb(db, structuredClone(fixture));
  await createProject(db, project("Mintleaf"));
  await createProject(db, project("Harbourline"));
});

describe("backup", () => {
  it("exports the knowledge base, every project with its documents and revisions, and the prefs (AC1)", async () => {
    const data = await exported();
    expect(data).toMatchObject({ app: "instant-resume", schemaVersion: 1, knowledgeBase: { contact: { name: fixture.contact.name } }, prefs: { paper: "A4" } });
    expect(data.projects).toHaveLength(2);
    for (const p of data.projects) {
      expect(p.documents).toHaveLength(1);
      expect(p.revisions).toHaveLength(1);
    }
  });

  it("never holds connections or keys, at any depth (AC2)", async () => {
    const keys = keysOf(await exported());
    for (const banned of ["connections", "key", "apiKey"]) expect(keys).not.toContain(banned);
  });

  it("restores a deleted project and leaves the data unchanged (AC3)", async () => {
    const db = await getDb();
    const before = await exported();
    await deleteProject(db, before.projects[0].project.id);
    expect(await listProjects(db)).toHaveLength(1);
    const res = await restore(before);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ projects: 2 });
    const after = await exported();
    expect({ ...after, exportedAt: 0 }).toEqual({ ...before, exportedAt: 0 });
  });

  it("rejects a file that isn't a backup, or has a broken project, and changes nothing", async () => {
    const db = await getDb();
    const before = await exported();
    expect((await restore({ hello: "world" })).status).toBe(422);
    const broken = structuredClone(before);
    broken.projects[0].documents[0].kind = "poem";
    broken.prefs.paper = "Letter";
    expect((await restore(broken)).status).toBe(422);
    expect(await listProjects(db)).toHaveLength(2);
    expect((await readPrefs(db)).paper).toBe("A4");
  });
});
