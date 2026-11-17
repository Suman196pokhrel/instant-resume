import { NextResponse, type NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { createProject, listProjects } from "@/lib/db/projects";

// GET /api/projects: the list, newest first. POST: create with documents and first revisions in one transaction.
export const GET = handle(async () => NextResponse.json(await listProjects(await getDb())));

export const POST = handle(async (request: NextRequest) =>
  NextResponse.json(await createProject(await getDb(), await readJson(request)), { status: 201 })
);
