import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/access/session";

// POST /api/lock (SPEC §4.1, Settings → Access "Lock now"): clears this device's session.
export function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie("", 0));
  return response;
}
