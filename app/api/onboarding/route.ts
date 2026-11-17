import { NextResponse, type NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { readOnboarding, writeOnboarding } from "@/lib/db/onboarding";

// GET/PUT /api/onboarding: wizard progress and draft (SPEC §7.2, §14.1).
export const GET = handle(async () => NextResponse.json(await readOnboarding(await getDb())));

export const PUT = handle(async (request: NextRequest) => NextResponse.json(await writeOnboarding(await getDb(), await readJson(request))));
