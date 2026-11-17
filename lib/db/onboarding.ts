import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { fillIds, KB_LIST_PREFIX, readKb, writeKb, type KbListKey } from "./kb";
import { settings } from "./schema";
import type { KnowledgeBase } from "../schemas/kb";
import { onboardingStateSchema, type OnboardingState } from "../schemas/settings";

// Onboarding progress and draft (SPEC §14.1, §7.2), stored in the settings table.
const KEY = "onboarding";
export const ONBOARDING_START: OnboardingState = { step: 0, maxStep: 0, draft: {}, completed: false, saveMode: "merge" };
const LISTS = Object.keys(KB_LIST_PREFIX) as KbListKey[];

/** The saved state, or the start state (also when an older saved shape no longer parses). */
export async function readOnboarding(db: Db): Promise<OnboardingState> {
  const row = await db.select().from(settings).where(eq(settings.key, KEY)).get();
  const parsed = onboardingStateSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : ONBOARDING_START;
}

/** Validates and saves the state, giving new entries and highlights their IDs. Throws (saving nothing) when invalid. */
export async function writeOnboarding(db: Db, input: unknown): Promise<OnboardingState> {
  const draft = (input as { draft?: Record<string, unknown> } | null)?.draft;
  if (draft && typeof draft === "object") {
    for (const key of LISTS) {
      const list = draft[key];
      if (Array.isArray(list)) draft[key] = list.map((e) => (e && typeof e === "object" ? fillIds(e, KB_LIST_PREFIX[key]) : e));
    }
  }
  const state = onboardingStateSchema.parse(input);
  await db.insert(settings).values({ key: KEY, value: state }).onConflictDoUpdate({ target: settings.key, set: { value: state } });
  return state;
}

/**
 * Saves the reviewed draft to the knowledge base (SPEC §1.4). Replace: the draft becomes the KB. Merge: the existing
 * contact and work rights stay, and list entries are added unless their ID is already there. Returns how many were added.
 */
// shortcut: the KB write and the state reset are two steps, not one transaction; a crash between them leaves the
// draft in place, so completing again merges nothing twice (IDs are skipped). Fine for one user.
export async function completeOnboarding(db: Db, mode: "merge" | "replace"): Promise<number> {
  const { draft } = await readOnboarding(db);
  const existing = mode === "merge" ? await readKb(db) : null;
  let added = 0;
  const kb = (existing ?? {
    schemaVersion: 1,
    contact: { ...draft.contact, id: "kb-contact" },
    ...(draft.workRights?.status && { workRights: { ...draft.workRights, id: "kb-rights" } }),
    ...Object.fromEntries(LISTS.map((k) => [k, []])),
  }) as KnowledgeBase;
  if (!existing) added += kb.workRights ? 2 : 1;
  for (const key of LISTS) {
    const list = kb[key] as { id: string }[];
    for (const entry of draft[key] ?? []) {
      if (list.some((e) => e.id === entry.id)) continue;
      list.push(entry);
      added++;
    }
  }
  await writeKb(db, kb);
  await writeOnboarding(db, { ...ONBOARDING_START, completed: true });
  return added;
}
