import { z } from "zod";
import { documentSchema } from "../schemas/document";
import { kbSchema } from "../schemas/kb";
import { projectSchema, revisionSchema } from "../schemas/project";
import { prefsSchema } from "../schemas/settings";
import type { Db } from "./client";
import { kbRows, readKb } from "./kb";
import { insertBundle, listProjects, readProject } from "./projects";
import { documents, kbEntries, projects, revisions, settings } from "./schema";
import { PREFS_KEY, readPrefs } from "./settings";

// Backup (SPEC §7.2, §14.6): the KB, every project and the prefs. Connections and keys live only in the browser,
// so they can't be in here.

const bundleSchema = z
  .object({ project: projectSchema, documents: z.array(documentSchema), revisions: z.array(revisionSchema) })
  .superRefine((b, ctx) => {
    const ids = new Set(b.documents.map((d) => d.id));
    if (b.documents.some((d) => d.projectId !== b.project.id)) ctx.addIssue({ code: "custom", path: ["documents"], message: "A document belongs to another project" });
    if (b.revisions.some((r) => !ids.has(r.documentId))) ctx.addIssue({ code: "custom", path: ["revisions"], message: "A revision belongs to another document" });
  });

const backupSchema = z.object({
  app: z.literal("instant-resume"),
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  knowledgeBase: kbSchema.nullable(),
  projects: z.array(bundleSchema),
  prefs: prefsSchema,
});

export async function exportBackup(db: Db) {
  const ids = (await listProjects(db)).map((p) => p.id);
  return {
    app: "instant-resume" as const,
    schemaVersion: 1 as const,
    exportedAt: new Date().toISOString(),
    knowledgeBase: await readKb(db),
    projects: await Promise.all(ids.map((id) => readProject(db, id))),
    prefs: await readPrefs(db),
  };
}

/** Validates the whole file, then replaces the KB, the projects and the prefs in one transaction. Returns the project count. */
export async function importBackup(db: Db, input: unknown): Promise<number> {
  const data = backupSchema.parse(input);
  await db.transaction(async (tx) => {
    await tx.delete(revisions);
    await tx.delete(documents);
    await tx.delete(projects);
    await tx.delete(kbEntries);
    if (data.knowledgeBase) await tx.insert(kbEntries).values(kbRows(data.knowledgeBase));
    // oldest revision first, so the newest-first reads keep the same order for equal timestamps
    for (const b of data.projects) await insertBundle(tx, { ...b, revisions: [...b.revisions].reverse() });
    await tx.insert(settings).values({ key: PREFS_KEY, value: data.prefs }).onConflictDoUpdate({ target: settings.key, set: { value: data.prefs } });
  });
  return data.projects.length;
}
