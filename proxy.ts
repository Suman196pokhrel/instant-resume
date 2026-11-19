import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/access/session";

// Browser-direct LLM calls (SPEC §4): the only hosts a page may talk to besides this server.
const PROVIDER_HOSTS = ["https://api.openai.com", "https://api.anthropic.com", "https://generativelanguage.googleapis.com"];

function contentSecurityPolicy(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    // A per-request nonce instead of 'unsafe-inline': Next.js needs inline scripts. 'wasm-unsafe-eval' is for Typst.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    // React style attributes and runtime-injected styles need inline styles; scripts stay locked down.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${PROVIDER_HOSTS.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // No upgrade-insecure-requests: the app is served over http://127.0.0.1 by default.
  ].join("; ");
}

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** The host the browser used. Behind a reverse proxy that's x-forwarded-host. */
const publicHost = (request: NextRequest) => request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;

/** Same-site check for state-changing API calls (SPEC §4.1). */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = publicHost(request);
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Access gate (SPEC §4.1): returns the response that stops this request, or null to let it through. */
async function gate(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, search } = request.nextUrl;
  const api = pathname === "/api" || pathname.startsWith("/api/");
  // In both modes: also stops other websites posting to a local 127.0.0.1 install.
  if (api && STATE_CHANGING.has(request.method) && !sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!process.env.APP_PASSWORD) return pathname === "/unlock" ? NextResponse.redirect(new URL("/", request.url)) : null;
  if (pathname === "/unlock" || (pathname === "/api/unlock" && request.method === "POST")) return null;
  if (await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return null;
  if (api) return NextResponse.json({ error: "locked" }, { status: 401 });
  // Next.js needs an absolute Location; build it from the public host and scheme, since request.url may carry the
  // internal ones behind a reverse proxy.
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || request.nextUrl.protocol.replace(":", "");
  return NextResponse.redirect(`${proto}://${publicHost(request)}/unlock?${new URLSearchParams({ next: pathname + search })}`, 307);
}

const isPrefetch = (request: NextRequest) =>
  request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch";

export async function proxy(request: NextRequest) {
  const stop = await gate(request);
  if (stop) return stop;
  if (isPrefetch(request)) return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  // Next.js reads the nonce from the request's CSP header while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Every request except static assets, prefetches included: the gate must see them all (CSP skips prefetches above).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
