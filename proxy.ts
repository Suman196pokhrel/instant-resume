import { NextResponse, type NextRequest } from "next/server";

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

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  // Next.js reads the nonce from the request's CSP header while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
