import { NextResponse, type NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { updateKb } from "@/lib/db/kb";

// PUT /api/kb/contact: replaces the contact entry (its id is fixed).
export const PUT = handle(async (request: NextRequest) => {
  const body = await readJson(request);
  const kb = await updateKb(await getDb(), (kb) => {
    kb.contact = { ...body, id: "kb-contact" } as typeof kb.contact;
  });
  return NextResponse.json(kb.contact);
});
