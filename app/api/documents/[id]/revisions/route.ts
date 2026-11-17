import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { listRevisions } from "@/lib/db/projects";

// GET /api/documents/:id/revisions: newest first.
export const GET = handle(async (_request: NextRequest, ctx: RouteContext<"/api/documents/[id]/revisions">) =>
  NextResponse.json(await listRevisions(await getDb(), (await ctx.params).id))
);
