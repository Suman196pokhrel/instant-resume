import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";

// GET /api/kb: the whole knowledge base, or null before onboarding creates it.
export const GET = handle(async () => NextResponse.json(await readKb(await getDb())));
