---
id: TASK-2
title: Password lock for a self-hosted install
status: Review
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T09:51:00Z'
labels:
  - m1
dependencies:
  - TASK-32
  - TASK-33
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As someone running Instant Resume on a private server, I can set APP_PASSWORD so nobody else can reach my knowledge base. Built before any route handler. Refs: SPEC §4.1, §18.1 Access, §18.3, §18.4 #16. Mock: Views.unlock.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 With APP_PASSWORD unset, no page or /api route asks for a session
- [x] #2 With it set, pages redirect to /unlock and /api routes return 401 {error: locked} without a valid session
- [x] #3 A wrong password returns 401, the 6th attempt within a minute returns 429, and the right one sets the ir_session cookie and lands on the requested page
- [x] #4 An expired or tampered cookie, or one signed before a password change, is rejected; POST /api/lock clears the cookie
- [x] #5 A state-changing request with a foreign Origin returns 403
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- lib/access/session.ts: secret at ./data/session-secret (32 random bytes, created lazily with flag wx + mode 0600; on EEXIST read it). hash = scrypt(APP_PASSWORD, secret); key = HMAC-SHA-256 key over secret+hash, so a new password signs everyone out. Cookie ir_session = "<exp>.<base64url hmac>" (HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age 30 days). verify: timingSafeEqual on the MAC, then exp > now. checkPassword: scrypt(input) vs hash with timingSafeEqual. Results cached per process.
- proxy.ts gate (Node runtime in Next 16), run before the CSP code. The matcher now covers prefetches too (TASK-1 note); CSP is still only added to non-prefetch requests. Order: (1) /api/* with POST/PUT/PATCH/DELETE: Origin host must equal x-forwarded-host ?? host, else 403 (both modes: also blocks other sites posting to 127.0.0.1). (2) No APP_PASSWORD: pass, and /unlock redirects to /. (3) Exempt /unlock and POST /api/unlock. (4) No valid session: /api/* → 401 {"error":"locked"}; pages → 307 /unlock?next=<path+query>.
- app/api/unlock/route.ts: 404 without a password; body must be {password: string ≤ 1024 chars} else 422; rate limit first (429 + Retry-After + {error:"rate_limited", retryAfter}); wrong → 401 {error:"wrong_password"}, plus retryAfter on the 5th failure so TASK-28 can start the countdown; right → 200 + Set-Cookie. app/api/lock/route.ts: clears the cookie (Max-Age=0).
- lib/access/rate-limit.ts: in-memory, 5 failures per client per 60 s, fixed window. Client = rightmost x-forwarded-for entry. shortcut: Next only sets XFF when absent, so without a reverse proxy a client can spoof it; SPEC requires HTTPS behind a proxy or a private network.
- safeNext(next): same-origin path only ("/x", not "//x", "/\\x" or absolute URLs), else /dashboard. Used by the TASK-28 screen.
- app/unlock/page.tsx: placeholder (h1 "Unlock Instant Resume") so the redirect target exists; the real screen is TASK-28.

Files
- lib/access/{session,rate-limit}.ts, proxy.ts, app/api/{unlock,lock}/route.ts, app/unlock/page.tsx, .gitignore (data/)
- tests/unit/session.test.ts, tests/unit/rate-limit.test.ts, tests/api/access.test.ts (call proxy() and the handlers with NextRequest; chdir to a temp dir for ./data)

Tests
- AC1: no APP_PASSWORD → a page, an /api GET and a same-origin POST all pass the proxy (x-middleware-next).
- AC2: with a password → /kb/roles 307 to /unlock?next=%2Fkb%2Froles; a prefetch request is gated too; /api/x 401 {error:"locked"}; /unlock and POST /api/unlock pass.
- AC3: wrong → 401; after 5 failures → 429 with Retry-After; right → 200 with every cookie attribute; that cookie lets /kb/roles through. The limiter resets after 60 s (fake clock); separate clients are counted apart.
- AC4: expired, tampered, and signed-under-the-old-password cookies → 401/307; POST /api/lock → Set-Cookie ir_session=; Max-Age=0.
- AC5: POST /api/x with a foreign Origin → 403, with no Origin → 403, same origin → passes; GET with a foreign Origin passes.
- Edge cases: 422 for a missing or oversized password; 404 for /api/unlock in local mode; the secret file is created once and reused; safeNext cases.

Out of scope
- The unlock screen UI, Settings → Access, the sidebar footer copy (TASK-28).
- Host-header / DNS-rebinding checks (to be parked).
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-16T00:41:00Z

---

From TASK-1: proxy.ts's CSP matcher skips prefetch requests (next-router-prefetch / purpose: prefetch). The lock gate must check every request except /unlock, POST /api/unlock and static assets (SPEC §4.1), so don't reuse that matcher as-is or prefetches bypass the lock.

---

created: 2026-11-17T09:51:00Z

---

Built in one commit. All 5 ACs covered by tests/api/access.test.ts + tests/unit/session.test.ts (44 unit/api, 30 e2e green). UI DoD: only a placeholder /unlock page here; the screen is TASK-28. vitest.config gained the @/ alias. Real-server smoke test in password mode not run (blocked); TASK-28's e2e #16 will cover it.

---
<!-- COMMENTS:END -->
