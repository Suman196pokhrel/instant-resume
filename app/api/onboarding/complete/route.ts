import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { completeOnboarding } from "@/lib/db/onboarding";

// POST /api/onboarding/complete { mode }: saves the reviewed draft (read from the DB, not the body) to the KB.
const bodySchema = z.object({ mode: z.enum(["merge", "replace"]) });

export const POST = handle(async (request: NextRequest) => {
  const { mode } = bodySchema.parse(await readJson(request));
  return NextResponse.json({ added: await completeOnboarding(await getDb(), mode) });
});
