import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { prefsSchema } from "@/lib/schemas/settings";

// GET/PUT /api/settings: prefs (SPEC §6.5), with the AU defaults filled in. Connections never come here.
const KEY = "prefs";

export const GET = handle(async () => {
  const row = await (await getDb()).select().from(settings).where(eq(settings.key, KEY)).get();
  return NextResponse.json(prefsSchema.parse(row?.value ?? {}));
});

export const PUT = handle(async (request: NextRequest) => {
  const prefs = prefsSchema.parse(await readJson(request));
  await (await getDb()).insert(settings).values({ key: KEY, value: prefs }).onConflictDoUpdate({ target: settings.key, set: { value: prefs } });
  return NextResponse.json(prefs);
});
