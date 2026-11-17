import { kbEntries, type KB_TYPES } from "./schema";
import type { Db } from "./client";
import { kbSchema, type KnowledgeBase } from "../schemas/kb";
import { upgrade } from "../schemas/migrate";

// The knowledge base is stored one row per entry (SPEC §7.1); contact and workRights are single rows.
const LISTS = {
  role: "roles",
  volunteering: "volunteering",
  portfolio: "portfolio",
  education: "education",
  skills: "skills",
  credential: "credentials",
  referee: "referees",
  additional: "additional",
} as const satisfies Partial<Record<(typeof KB_TYPES)[number], keyof KnowledgeBase>>;

/** Validates, then replaces the whole knowledge base in one transaction. Throws (writing nothing) when invalid. */
export async function writeKb(db: Db, input: unknown): Promise<KnowledgeBase> {
  const kb = kbSchema.parse(input);
  const updatedAt = new Date().toISOString();
  const rows = [
    { id: kb.contact.id, type: "contact" as const, position: 0, data: kb.contact as unknown },
    { id: kb.workRights.id, type: "workRights" as const, position: 0, data: kb.workRights as unknown },
    ...Object.entries(LISTS).flatMap(([type, key]) =>
      kb[key].map((data, position) => ({ id: data.id, type: type as keyof typeof LISTS, position, data: data as unknown }))
    ),
  ].map((row) => ({ ...row, schemaVersion: kb.schemaVersion, updatedAt }));

  await db.transaction(async (tx) => {
    await tx.delete(kbEntries);
    await tx.insert(kbEntries).values(rows);
  });
  return kb;
}

/** Reads the knowledge base, running the schemaVersion migration hook, or null when there is none yet. */
export async function readKb(db: Db): Promise<KnowledgeBase | null> {
  const rows = await db.select().from(kbEntries).orderBy(kbEntries.type, kbEntries.position);
  if (!rows.length) return null;
  // writeKb stores every row at the same version; the highest one wins so newer data is never misread.
  const kb: Record<string, unknown> & { schemaVersion: number } = { schemaVersion: Math.max(...rows.map((r) => r.schemaVersion)) };
  for (const key of Object.values(LISTS)) kb[key] = [];
  for (const row of rows) {
    if (row.type === "contact" || row.type === "workRights") kb[row.type] = row.data;
    else (kb[LISTS[row.type]] as unknown[]).push(row.data);
  }
  return kbSchema.parse(upgrade(kb));
}
