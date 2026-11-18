import { NextResponse, type NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { PREFS_KEY, readPrefs } from "@/lib/db/settings";
import { prefsSchema } from "@/lib/schemas/settings";

// GET/PUT /api/settings: prefs (SPEC §6.5), with the AU defaults filled in. Connections never come here.
export const GET = handle(async () => NextResponse.json(await readPrefs(await getDb())));

export const PUT = handle(async (request: NextRequest) => {
  const prefs = prefsSchema.parse(await readJson(request));
  await (await getDb()).insert(settings).values({ key: PREFS_KEY, value: prefs }).onConflictDoUpdate({ target: settings.key, set: { value: prefs } });
  return NextResponse.json(prefs);
});
