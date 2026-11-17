import { NextResponse, type NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { updateKb } from "@/lib/db/kb";

// PUT /api/kb/work-rights: replaces the work rights entry (its id is fixed).
export const PUT = handle(async (request: NextRequest) => {
  const body = await readJson(request);
  const kb = await updateKb(await getDb(), (kb) => {
    kb.workRights = { ...body, id: "kb-rights" } as typeof kb.workRights;
  });
  return NextResponse.json(kb.workRights);
});
