import { NextResponse, type NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { saveDocument } from "@/lib/db/projects";

// PUT /api/documents/:id: save content and theme; the body's revision is appended.
export const PUT = handle(async (request: NextRequest, ctx: RouteContext<"/api/documents/[id]">) =>
  NextResponse.json(await saveDocument(await getDb(), (await ctx.params).id, await readJson(request)))
);
