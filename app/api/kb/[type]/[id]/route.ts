import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handle, noContent, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { fillIds, isKbList, KB_LIST_PREFIX, updateKb } from "@/lib/db/kb";

type Ctx = RouteContext<"/api/kb/[type]/[id]">;

/** Finds the entry's index in its list, or 404. */
function indexOf(list: { id: string }[], id: string) {
  const i = list.findIndex((e) => e.id === id);
  if (i < 0) throw new ApiError(404, "not_found");
  return i;
}

async function target(ctx: Ctx) {
  const { type, id } = await ctx.params;
  if (!isKbList(type)) throw new ApiError(404, "not_found");
  return { type, id };
}

// PATCH /api/kb/:type/:id: merges the given fields into the entry; its id never changes.
export const PATCH = handle(async (request: NextRequest, ctx: Ctx) => {
  const { type, id } = await target(ctx);
  const body = fillIds({ ...(await readJson(request)), id }, KB_LIST_PREFIX[type]); // new highlights get IDs
  const kb = await updateKb(await getDb(), (kb) => {
    const list = kb[type] as { id: string }[];
    const i = indexOf(list, id);
    list[i] = { ...list[i], ...body, id };
  });
  return NextResponse.json(kb[type].find((e) => e.id === id));
});

// DELETE /api/kb/:type/:id
export const DELETE = handle(async (_request: NextRequest, ctx: Ctx) => {
  const { type, id } = await target(ctx);
  await updateKb(await getDb(), (kb) => {
    const list = kb[type] as { id: string }[];
    list.splice(indexOf(list, id), 1);
  });
  return noContent();
});
