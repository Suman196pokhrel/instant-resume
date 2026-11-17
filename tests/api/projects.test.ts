/* eslint-disable @typescript-eslint/no-explicit-any -- response bodies are inspected loosely */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import * as projects from "@/app/api/projects/route";
import * as project from "@/app/api/projects/[id]/route";
import * as duplicate from "@/app/api/projects/[id]/duplicate/route";
import * as doc from "@/app/api/documents/[id]/route";
import * as revisions from "@/app/api/documents/[id]/revisions/route";
import { getDb } from "@/lib/db/client";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";

// SPEC §7.2 projects, documents and revisions routes, §6.4, §18.3.
const req = (method: string, body?: unknown) =>
  new NextRequest("http://app.test/api/x", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as any;
const json = async (res: Response) => (res.status === 204 ? null : res.json());

const keysOf = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap(keysOf) : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...keysOf(x)]) : [];
const SECRET = { apiKey: "sk-ant-secret", key: "k", connection: { provider: "openai", apiKey: "sk-x" } };
const noSecrets = (v: unknown) => expect(keysOf(v).filter((k) => ["apiKey", "key", "connection", "connections"].includes(k))).toEqual([]);

const brief = {
  title: "Senior Full Stack Engineer",
  company: "Mintleaf",
  location: "Melbourne VIC",
  seniority: "Senior",
  requirements: ["React, TypeScript and Node.js", "AWS in production", "Mentoring"],
  niceToHave: ["GraphQL"],
  keywords: ["React", "TypeScript", "AWS"],
  workRights: "Not stated",
};
const resume = (summary = "Senior engineer who ships.") => ({
  kind: "resume",
  theme: { ...THEME_DEFAULTS, ...SECRET },
  sections: [
    { id: "sec-sum", kind: "summary", title: "Summary", hidden: false, text: summary },
    {
      id: "sec-exp",
      kind: "experience",
      title: "Experience",
      hidden: false,
      items: [{ id: "it-bw", ref: "role-brightwater", heading: "Senior Software Engineer", bullets: [{ id: "b-1", text: "Cut load time to 1.1s", source: "hl-bw-1", ...SECRET }] }],
    },
  ],
});
const letter = {
  kind: "coverLetter",
  theme: THEME_DEFAULTS,
  recipient: { name: "Hiring Manager", company: "Mintleaf", location: "Melbourne VIC" },
  sections: ["Opening", "Evidence", "Fit", "Close"].map((title, i) => ({ id: `sec-p${i}`, kind: "paragraph", title, hidden: false, text: `${title} text` })),
};
const create = (over: Record<string, unknown> = {}, documents: unknown[] = [resume(), letter]) =>
  projects.POST(
    req("POST", {
      project: { company: "Mintleaf", role: "Senior Full Stack Engineer", location: "Melbourne VIC", jdText: "We are hiring…", brief, selected: ["role-brightwater"], source: "studio", ...SECRET, ...over },
      documents,
      ...SECRET,
    })
  );
const count = async (table: string) => (await (await getDb()).all<{ n: number }>(sql.raw(`select count(*) as n from ${table}`)))[0].n;

beforeAll(() => {
  process.chdir(mkdtempSync(join(tmpdir(), "ir-projects-")));
});

let created: any;

describe("create (AC2)", () => {
  it("an invalid body creates no rows at all", async () => {
    for (const res of [
      await create({ brief: undefined }),
      await create({}, [resume(), resume()]),
      await create({}, [letter]),
      await create({}, [{ ...resume(), sections: [{ ...resume().sections[1], items: [{ ...resume().sections[1].items![0], bullets: [{ id: "b", text: "x" }] }] }] }]),
    ]) {
      expect(res.status).toBe(422);
      expect((await res.json()).issues.length).toBeGreaterThan(0);
    }
    expect(await count("projects")).toBe(0);
    expect(await count("documents")).toBe(0);
  });

  it("201 creates the project, both documents and their first revisions", async () => {
    const res = await create();
    expect(res.status).toBe(201);
    created = await res.json();
    noSecrets(created);
    expect(created.project.id).toMatch(/^p-[0-9a-f]{8}$/);
    expect(created.project).toMatchObject({ schemaVersion: 1, company: "Mintleaf" });
    expect(created.documents.map((d: any) => d.kind).sort()).toEqual(["coverLetter", "resume"]);
    for (const d of created.documents) {
      expect(d.id).toMatch(/^doc-[0-9a-f]{8}$/);
      expect(d.projectId).toBe(created.project.id);
    }
    expect(created.revisions).toHaveLength(2);
    expect(created.revisions.every((r: any) => r.kind === "generation" && r.label === "Generated from job brief")).toBe(true);
    expect(await count("revisions")).toBe(2);
  });
});

describe("read, rename and duplicate (AC1)", () => {
  it("lists and gets the project", async () => {
    const list = await json(await projects.GET());
    expect(list).toEqual([expect.objectContaining({ id: created.project.id, company: "Mintleaf", role: "Senior Full Stack Engineer", location: "Melbourne VIC" })]);
    const got = await json(await project.GET(req("GET"), ctx(created.project.id)));
    expect(got.project).toEqual(created.project);
    expect(got.documents).toHaveLength(2);
    expect(got.revisions).toHaveLength(2);
  });

  it("PATCH renames, and only editable fields change", async () => {
    const res = await project.PATCH(req("PATCH", { role: "Lead Engineer", id: "p-hacked", schemaVersion: 9, createdAt: "1999", ...SECRET }), ctx(created.project.id));
    expect(res.status).toBe(200);
    const p = await res.json();
    noSecrets(p);
    expect(p).toMatchObject({ id: created.project.id, role: "Lead Engineer", schemaVersion: 1, createdAt: created.project.createdAt });
    expect((await project.PATCH(req("PATCH", { brief: { ...brief, seniority: "Boss" } }), ctx(created.project.id))).status).toBe(422);
  });

  it("duplicate copies everything with new ids", async () => {
    const res = await duplicate.POST(req("POST"), ctx(created.project.id));
    expect(res.status).toBe(201);
    const copy = await res.json();
    expect(copy.project.id).not.toBe(created.project.id);
    expect(copy.project.role).toBe("Lead Engineer (copy)");
    const resumeCopy = copy.documents.find((d: any) => d.kind === "resume");
    expect(resumeCopy.id).not.toBe(created.documents.find((d: any) => d.kind === "resume").id);
    expect(resumeCopy.sections).toEqual(created.documents.find((d: any) => d.kind === "resume").sections);
    expect(copy.revisions).toHaveLength(2);
    for (const r of copy.revisions) {
      expect(copy.documents.map((d: any) => d.id)).toContain(r.documentId);
      expect(r.snapshot.id).toBe(r.documentId);
      expect(r.snapshot.projectId).toBe(copy.project.id);
    }
    created.copy = copy;
  });

  it("404 for an unknown id", async () => {
    expect((await project.GET(req("GET"), ctx("p-nope"))).status).toBe(404);
    expect((await project.PATCH(req("PATCH", { role: "x" }), ctx("p-nope"))).status).toBe(404);
    expect((await project.DELETE(req("DELETE"), ctx("p-nope"))).status).toBe(404);
    expect((await duplicate.POST(req("POST"), ctx("p-nope"))).status).toBe(404);
    expect((await doc.PUT(req("PUT", { theme: THEME_DEFAULTS, sections: [], revision: { kind: "edit", label: "x" } }), ctx("doc-nope"))).status).toBe(404);
    expect((await revisions.GET(req("GET"), ctx("doc-nope"))).status).toBe(404);
  });
});

describe("saving a document (AC4)", () => {
  it("saves content and theme, appends the revision and moves the project to the top", async () => {
    const original = created.documents.find((d: any) => d.kind === "resume");
    const body = { ...resume("Edited summary."), id: "doc-hacked", kind: "coverLetter", projectId: "p-x", theme: { ...THEME_DEFAULTS, baseSize: 11 } };
    const res = await doc.PUT(req("PUT", { ...body, revision: { kind: "edit", label: "Edited Summary", coalesceKey: "edit-sec-sum", ...SECRET } }), ctx(original.id));
    expect(res.status).toBe(200);
    const saved = await res.json();
    noSecrets(saved);
    expect(saved.document).toMatchObject({ id: original.id, projectId: created.project.id, kind: "resume", theme: { baseSize: 11 } });
    expect(saved.document.sections[0].text).toBe("Edited summary.");
    expect(saved.revision).toMatchObject({ documentId: original.id, kind: "edit", label: "Edited Summary", coalesceKey: "edit-sec-sum" });
    expect(saved.revision.snapshot).toEqual(saved.document);

    const list = await json(await revisions.GET(req("GET"), ctx(original.id)));
    expect(list.map((r: any) => r.label)).toEqual(["Edited Summary", "Generated from job brief"]);
    expect((await json(await projects.GET()))[0].id).toBe(created.project.id);
  });

  it("a bad theme is 422 and saves nothing", async () => {
    const original = created.documents.find((d: any) => d.kind === "resume");
    const res = await doc.PUT(req("PUT", { theme: { ...THEME_DEFAULTS, margin: 40 }, sections: [], revision: { kind: "adjustment", label: "Adjusted design" } }), ctx(original.id));
    expect(res.status).toBe(422);
    expect(await json(await revisions.GET(req("GET"), ctx(original.id)))).toHaveLength(2);
  });
});

describe("delete (AC3)", () => {
  it("removes the project's documents and revisions and leaves the copy", async () => {
    expect((await project.DELETE(req("DELETE"), ctx(created.project.id))).status).toBe(204);
    const db = await getDb();
    const left = await db.all<{ project_id: string }>(sql`select project_id from documents`);
    expect(left.every((d) => d.project_id === created.copy.project.id)).toBe(true);
    expect(await count("revisions")).toBe(2);
    expect((await json(await projects.GET())).map((p: any) => p.id)).toEqual([created.copy.project.id]);
  });
});

describe("no key fields (AC5)", () => {
  it("no stored JSON column carries one", async () => {
    const rows = await (await getDb()).all<Record<string, string | null>>(
      sql`select brief as a, selected as b, gaps as c from projects union all select content, theme, null from documents union all select snapshot, null, null from revisions`
    );
    noSecrets(rows.flatMap((r) => Object.values(r).filter(Boolean).map((v) => JSON.parse(v as string))));
  });
});
