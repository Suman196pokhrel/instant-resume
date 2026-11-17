import { NextResponse, type NextRequest } from "next/server";
import { handle, noContent, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { deleteProject, readProject, updateProject } from "@/lib/db/projects";

type Ctx = RouteContext<"/api/projects/[id]">;

// GET /api/projects/:id (project, documents, revisions), PATCH (rename or update brief), DELETE (cascades).
export const GET = handle(async (_request: NextRequest, ctx: Ctx) => NextResponse.json(await readProject(await getDb(), (await ctx.params).id)));

export const PATCH = handle(async (request: NextRequest, ctx: Ctx) =>
  NextResponse.json(await updateProject(await getDb(), (await ctx.params).id, await readJson(request)))
);

export const DELETE = handle(async (_request: NextRequest, ctx: Ctx) => {
  await deleteProject(await getDb(), (await ctx.params).id);
  return noContent();
});
