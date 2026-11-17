import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "../api";
import { documentSchema, type ResumeDocument } from "../schemas/document";
import { upgrade } from "../schemas/migrate";
import { projectSchema, revisionSchema, type Project, type Revision } from "../schemas/project";
import type { Db } from "./client";
import { newId } from "./kb";
import { documents, projects, revisions } from "./schema";

// Projects, documents and revisions (SPEC §6.4, §7.2). Every row is validated on write and on read;
// the server makes all IDs and timestamps.
export type ProjectBundle = { project: Project; documents: ResumeDocument[]; revisions: Revision[] };

const now = () => new Date().toISOString();
const notFound = () => new ApiError(404, "not_found");

const toProject = (r: typeof projects.$inferSelect): Project =>
  projectSchema.parse(upgrade({ ...r, gaps: r.gaps ?? undefined, notes: r.notes ?? undefined }));
const fromProject = (p: Project) => ({ ...p, coverLetterOff: p.coverLetterOff ?? false, gaps: p.gaps ?? null, notes: p.notes ?? null });
const toDocument = (r: typeof documents.$inferSelect): ResumeDocument =>
  documentSchema.parse({ id: r.id, projectId: r.projectId, kind: r.kind, theme: r.theme, ...(r.content as object) });
const fromDocument = (d: ResumeDocument, updatedAt: string) => ({
  id: d.id,
  projectId: d.projectId,
  kind: d.kind,
  theme: d.theme,
  content: { sections: d.sections, recipient: d.recipient },
  updatedAt,
});
const toRevision = (r: typeof revisions.$inferSelect): Revision => revisionSchema.parse({ ...r, coalesceKey: r.coalesceKey ?? undefined });
const fromRevision = (r: Revision) => ({ ...r, coalesceKey: r.coalesceKey ?? null });

const projectInput = projectSchema.pick({
  company: true,
  role: true,
  location: true,
  jdText: true,
  brief: true,
  selected: true,
  source: true,
  coverLetterOff: true,
  gaps: true,
  notes: true,
});
const createSchema = z
  .object({ project: projectInput, documents: z.array(documentSchema.omit({ id: true, projectId: true })) })
  .superRefine((body, ctx) => {
    const kinds = body.documents.map((d) => d.kind);
    if (kinds.filter((k) => k === "resume").length !== 1) ctx.addIssue({ code: "custom", path: ["documents"], message: "Include exactly one resume" });
    if (kinds.filter((k) => k === "coverLetter").length > 1) ctx.addIssue({ code: "custom", path: ["documents"], message: "Include at most one cover letter" });
  });
const patchSchema = projectInput.omit({ jdText: true, source: true }).partial();
const saveSchema = z.object({ revision: revisionSchema.pick({ kind: true, label: true, coalesceKey: true }) });

async function insertAll(db: Db, { project, documents: docs, revisions: revs }: ProjectBundle) {
  await db.transaction(async (tx) => {
    await tx.insert(projects).values(fromProject(project));
    if (docs.length) await tx.insert(documents).values(docs.map((d) => fromDocument(d, project.updatedAt)));
    if (revs.length) await tx.insert(revisions).values(revs.map(fromRevision));
  });
}

async function projectRow(db: Db, id: string) {
  const row = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!row) throw notFound();
  return row;
}

export async function listProjects(db: Db) {
  return db
    .select({ id: projects.id, company: projects.company, role: projects.role, location: projects.location, updatedAt: projects.updatedAt })
    .from(projects)
    .orderBy(desc(projects.updatedAt));
}

/** The project, its documents and their revisions (newest first). */
export async function readProject(db: Db, id: string): Promise<ProjectBundle> {
  const project = toProject(await projectRow(db, id));
  const docs = (await db.select().from(documents).where(eq(documents.projectId, id))).map(toDocument);
  const revs = docs.length
    ? await db
        .select()
        .from(revisions)
        .where(inArray(revisions.documentId, docs.map((d) => d.id)))
        .orderBy(desc(revisions.ts), sql`rowid desc`)
    : [];
  return { project, documents: docs, revisions: revs.map(toRevision) };
}

/** Validates everything first, then saves the project, its documents and one first revision each in one transaction. */
export async function createProject(db: Db, input: unknown): Promise<ProjectBundle> {
  const body = createSchema.parse(input);
  const ts = now();
  const id = newId("p");
  const project = projectSchema.parse({ ...body.project, id, schemaVersion: 1, createdAt: ts, updatedAt: ts });
  const docs = body.documents.map((d) => documentSchema.parse({ ...d, id: newId("doc"), projectId: id }));
  const revs = docs.map((d) =>
    revisionSchema.parse({ id: newId("rev"), documentId: d.id, ts, kind: "generation", label: "Generated from job brief", snapshot: d })
  );
  await insertAll(db, { project, documents: docs, revisions: revs });
  return readProject(db, id);
}

export async function updateProject(db: Db, id: string, input: unknown): Promise<Project> {
  const patch = patchSchema.parse(input);
  const merged = projectSchema.parse({ ...toProject(await projectRow(db, id)), ...patch, updatedAt: now() });
  await db.update(projects).set(fromProject(merged)).where(eq(projects.id, id));
  return merged;
}

/** Deletes the project; the foreign keys cascade to its documents and revisions. */
export async function deleteProject(db: Db, id: string) {
  const gone = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
  if (!gone.length) throw notFound();
}

/** Copies the project ("… (copy)"), its documents and every revision, with new IDs throughout. */
export async function duplicateProject(db: Db, id: string): Promise<ProjectBundle> {
  const src = await readProject(db, id);
  const ts = now();
  const pid = newId("p");
  const docIds = new Map(src.documents.map((d) => [d.id, newId("doc")]));
  const project = { ...src.project, id: pid, role: `${src.project.role} (copy)`, createdAt: ts, updatedAt: ts };
  const docs = src.documents.map((d) => ({ ...d, id: docIds.get(d.id)!, projectId: pid }));
  const revs = [...src.revisions].reverse().map((r) => {
    const documentId = docIds.get(r.documentId)!;
    return { ...r, id: newId("rev"), documentId, snapshot: { ...r.snapshot, id: documentId, projectId: pid } };
  });
  await insertAll(db, { project, documents: docs, revisions: revs });
  return readProject(db, pid);
}

/** Saves a document's content and theme and appends its revision (coalescing is TASK-19). id, project and kind stay fixed. */
export async function saveDocument(db: Db, id: string, input: Record<string, unknown>) {
  const row = await db.select().from(documents).where(eq(documents.id, id)).get();
  if (!row) throw notFound();
  const { revision: meta } = saveSchema.parse(input);
  const ts = now();
  const document = documentSchema.parse({ ...input, id: row.id, projectId: row.projectId, kind: row.kind });
  const revision = revisionSchema.parse({ ...meta, id: newId("rev"), documentId: id, ts, snapshot: document });
  await db.transaction(async (tx) => {
    const { content, theme, updatedAt } = fromDocument(document, ts);
    await tx.update(documents).set({ content, theme, updatedAt }).where(eq(documents.id, id));
    await tx.insert(revisions).values(fromRevision(revision));
    await tx.update(projects).set({ updatedAt: ts }).where(eq(projects.id, row.projectId));
  });
  return { document, revision };
}

export async function listRevisions(db: Db, documentId: string): Promise<Revision[]> {
  const doc = await db.select({ id: documents.id }).from(documents).where(eq(documents.id, documentId)).get();
  if (!doc) throw notFound();
  const rows = await db.select().from(revisions).where(eq(revisions.documentId, documentId)).orderBy(desc(revisions.ts), sql`rowid desc`);
  return rows.map(toRevision);
}
