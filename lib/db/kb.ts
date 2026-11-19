import { kbEntries, type KB_TYPES } from "./schema";
import type { Db } from "./client";
import { kbSchema, type KnowledgeBase } from "../schemas/kb";
import { upgrade } from "../schemas/migrate";
import { ApiError } from "../api";
import { newId } from "../utils";
export { newId };

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

/** The kb_entries rows for a validated knowledge base (also used by backup import). */
export function kbRows(kb: KnowledgeBase) {
  const updatedAt = new Date().toISOString();
  return [
    { id: kb.contact.id, type: "contact" as const, position: 0, data: kb.contact as unknown },
    ...(kb.workRights ? [{ id: kb.workRights.id, type: "workRights" as const, position: 0, data: kb.workRights as unknown }] : []),
    ...Object.entries(LISTS).flatMap(([type, key]) =>
      kb[key].map((data, position) => ({ id: data.id, type: type as keyof typeof LISTS, position, data: data as unknown }))
    ),
  ].map((row) => ({ ...row, schemaVersion: kb.schemaVersion, updatedAt }));
}

/** Validates, then replaces the whole knowledge base in one transaction. Throws (writing nothing) when invalid. */
export async function writeKb(db: Db, input: unknown): Promise<KnowledgeBase> {
  const kb = kbSchema.parse(input);
  const rows = kbRows(kb);
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

/** URL list types (SPEC §7.2 /api/kb/:type) and the prefix of the IDs generated for them. */
export const KB_LIST_PREFIX = {
  roles: "role",
  volunteering: "vol",
  portfolio: "pf",
  education: "ed",
  skills: "sk",
  credentials: "cr",
  referees: "ref",
  additional: "add",
} as const;
export type KbListKey = keyof typeof KB_LIST_PREFIX;

export const isKbList = (type: string): type is KbListKey => Object.hasOwn(KB_LIST_PREFIX, type);

/** Gives an incoming entry, and each of its highlights, an ID when it has none. */
export function fillIds(entry: Record<string, unknown>, prefix: string) {
  entry.id ||= newId(prefix);
  if (Array.isArray(entry.highlights)) {
    entry.highlights = entry.highlights.map((h: Record<string, unknown>) => ({ ...h, id: h?.id || newId("hl") }));
  }
  return entry;
}

/** Read, change, then save the whole KB, so every change is validated as a whole (the KB is small). */
// shortcut: read and write are separate steps, so two simultaneous edits can lose one; fine for one user with
// debounced saves. Move both into one transaction if the KB screen ever saves in parallel.
export async function updateKb(db: Db, change: (kb: KnowledgeBase) => void): Promise<KnowledgeBase> {
  const kb = await readKb(db);
  if (!kb) throw new ApiError(409, "no_knowledge_base");
  change(kb);
  return writeKb(db, kb);
}
