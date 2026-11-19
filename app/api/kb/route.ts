import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { readKb, wipeKb } from "@/lib/db/kb";

// GET /api/kb: the whole knowledge base, or null before onboarding creates it.
export const GET = handle(async () => NextResponse.json(await readKb(await getDb())));

// DELETE /api/kb: wipes the knowledge base and the onboarding draft (Settings → Your data). Applications stay.
export const DELETE = handle(async () => {
  await wipeKb(await getDb());
  return new NextResponse(null, { status: 204 });
});
