import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { fillIds, isKbList, KB_LIST_PREFIX, updateKb } from "@/lib/db/kb";

// POST /api/kb/:type: appends an entry, generating any missing entry or highlight IDs. ?at=N inserts it at N
// instead (Undo after a delete); an entry whose id is already there isn't added twice.
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/kb/[type]">) => {
  const { type } = await ctx.params;
  if (!isKbList(type)) throw new ApiError(404, "not_found");
  const entry = fillIds(await readJson(request), KB_LIST_PREFIX[type]);
  const at = Number(request.nextUrl.searchParams.get("at") ?? NaN);
  let added = false;
  const kb = await updateKb(await getDb(), (kb) => {
    const list = kb[type] as { id: string }[];
    if (list.some((e) => e.id === entry.id)) return;
    list.splice(Number.isInteger(at) && at >= 0 ? at : list.length, 0, entry as { id: string }); // fillIds gave it an id; writeKb checks the rest
    added = true;
  });
  return NextResponse.json(kb[type].find((e) => e.id === entry.id), { status: added ? 201 : 200 });
});
