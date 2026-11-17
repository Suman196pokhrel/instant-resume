import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { fillIds, isKbList, KB_LIST_PREFIX, updateKb } from "@/lib/db/kb";

// POST /api/kb/:type: appends an entry, generating any missing entry or highlight IDs.
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/kb/[type]">) => {
  const { type } = await ctx.params;
  if (!isKbList(type)) throw new ApiError(404, "not_found");
  const entry = fillIds(await readJson(request), KB_LIST_PREFIX[type]);
  const kb = await updateKb(await getDb(), (kb) => {
    (kb[type] as unknown[]).push(entry);
  });
  return NextResponse.json(kb[type].find((e) => e.id === entry.id), { status: 201 });
});
