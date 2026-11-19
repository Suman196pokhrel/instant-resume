import { NextResponse, type NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { exportBackup, importBackup } from "@/lib/db/backup";
import { getDb } from "@/lib/db/client";

// GET/POST /api/backup (SPEC §7.2, §14.6): export everything but the keys; import replaces it all in one go.
export const GET = handle(async () => NextResponse.json(await exportBackup(await getDb())));

export const POST = handle(async (request: NextRequest) => NextResponse.json({ projects: await importBackup(await getDb(), await readJson(request)) }));
