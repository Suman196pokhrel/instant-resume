import { NextResponse, type NextRequest } from "next/server";
import { clientOf, rateLimiter } from "@/lib/access/rate-limit";
import { checkPassword, sessionCookie, signSession } from "@/lib/access/session";

const limiter = rateLimiter();

// POST /api/unlock { password } (SPEC §4.1, §7.2). Password mode only; the proxy has already checked the Origin.
export async function POST(request: NextRequest) {
  if (!process.env.APP_PASSWORD) return new NextResponse(null, { status: 404 });

  const client = clientOf(request.headers);
  const wait = limiter.retryAfter(client);
  if (wait) return NextResponse.json({ error: "rate_limited", retryAfter: wait }, { status: 429, headers: { "Retry-After": String(wait) } });
  // Count the attempt before any await, so parallel guesses can't all slip past the check; cleared on success.
  const retryAfter = limiter.fail(client);

  const body: unknown = await request.json().catch(() => null);
  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== "string" || !password || password.length > 1024) {
    return NextResponse.json({ error: "invalid_body" }, { status: 422 });
  }

  if (!(await checkPassword(password))) {
    return NextResponse.json(retryAfter ? { error: "wrong_password", retryAfter } : { error: "wrong_password" }, { status: 401 });
  }
  limiter.clear(client);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie(await signSession()));
  return response;
}
