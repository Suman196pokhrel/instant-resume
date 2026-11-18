import { eq } from "drizzle-orm";
import { prefsSchema, type Prefs } from "../schemas/settings";
import type { Db } from "./client";
import { settings } from "./schema";

// Prefs (SPEC §6.5), with the AU defaults filled in. Connections never come here.
export const PREFS_KEY = "prefs";

export async function readPrefs(db: Db): Promise<Prefs> {
  const row = await db.select().from(settings).where(eq(settings.key, PREFS_KEY)).get();
  return prefsSchema.parse(row?.value ?? {});
}
