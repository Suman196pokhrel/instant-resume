import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { duplicateProject } from "@/lib/db/projects";

// POST /api/projects/:id/duplicate
export const POST = handle(async (_request: NextRequest, ctx: RouteContext<"/api/projects/[id]/duplicate">) =>
  NextResponse.json(await duplicateProject(await getDb(), (await ctx.params).id), { status: 201 })
);
