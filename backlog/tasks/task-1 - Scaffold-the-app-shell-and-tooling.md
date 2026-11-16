---
id: TASK-1
title: Scaffold the app, shell and tooling
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:47:00Z'
labels:
  - m0
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As the developer, I can run a scaffolded Next.js app with the app shell, tokens and every route stubbed, so each later story has a home and a test harness. Refs: SPEC §3, §5, §11, §13, §19 M0. Visual reference: mock/ shell and styles.css tokens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm dev serves the app on 127.0.0.1 with the sidebar showing exactly Applications, Knowledge base and Settings, styled with the §11 tokens and Schibsted Grotesk
- [x] #2 Every route in §5 renders a stub page inside the right layout (shell, or compact sidebar for /projects/[id])
- [x] #3 pnpm typecheck, lint, test and test:e2e each pass, with one Vitest and one Playwright smoke test
- [x] #4 Responses carry the §4 Content-Security-Policy header
- [x] #5 Startup refuses a non-loopback HOST without APP_PASSWORD, and an APP_PASSWORD under 12 characters, with a clear message
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Approach
- Scaffold with create-next-app 16.4 (TS, App Router, Tailwind v4, ESLint, no src/, alias @/*) in a temp dir, then move it to the repo root. Keep our README, AGENTS.md, LICENSE and .gitignore (merge its ignores, plus data/). Pin packageManager pnpm@10.33.4; .npmrc shell-emulator=true so the scripts' ${HOST:-127.0.0.1} works on every OS.
- shadcn init with --base base (Base UI). Map the §11.1 colours, §11.2 type and §11.3 radii and focus ring onto shadcn variables in app/globals.css. Schibsted Grotesk via next/font/google. Motion tokens and components belong to TASK-32.
- Routes follow the mock (§23.3 tie-break; SPEC §5 updated in the same commit): the onboarding chooser and /import live under (shell) as §13 says; the full-screen manual wizard is app/(focus)/onboarding/manual.
- Shell: app/(shell)/layout.tsx with Sidebar (brand, 3 nav items, "Stored on this device" footer), compact on /projects/[id], bottom bar at ≤900px; TopBar (58px, title slot, empty right slot for the model picker). Copy the mock's markup and measurements.
- CSP from proxy.ts with a per-request nonce (Next 16 docs). script-src 'self' 'nonce-…' 'strict-dynamic' 'wasm-unsafe-eval' (+ 'unsafe-eval' in dev only); style-src 'self' 'unsafe-inline' (React style attributes and sonner need it); connect-src 'self' plus the 3 provider hosts; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'. No upgrade-insecure-requests (the app runs over http://127.0.0.1). worker-src 'self' blob: (strict-dynamic ignores 'self' for scripts; the TASK-5 Typst worker needs it). Nonces need per-request rendering: app/layout.tsx awaits connection() once, and Cache Components/PPR stay off. Fine for a local app. proxy.ts is also where TASK-2's lock gate goes.
- Startup check: a pure checkStartup(env) in lib/access/startup.ts; instrumentation.ts register() (Node runtime only) prints the message and exits 1.

## Files
package.json, pnpm-lock.yaml, pnpm-workspace.yaml (build-script approvals), .npmrc, next.config.ts, tsconfig.json, eslint.config.mjs, postcss.config.mjs, components.json, proxy.ts, instrumentation.ts, app/layout.tsx, app/globals.css, app/page.tsx, app/(focus)/onboarding/manual/page.tsx, app/(shell)/layout.tsx, app/(shell)/{onboarding,import,dashboard,settings,new,new/quick,new/studio}/page.tsx, app/(shell)/kb/[section]/page.tsx, app/(shell)/projects/[id]/page.tsx, components/shell/{Sidebar,TopBar}.tsx, lib/access/startup.ts, lib/utils.ts, vitest.config.ts, playwright.config.ts, tests/unit/startup.test.ts, tests/e2e/shell.spec.ts, .gitignore, AGENTS.md (Current state + the run/test commands), README (dev setup lines only), docs/SPEC.md §5 (route tree).

## Data or API changes
None. / redirects to /dashboard until TASK-3 adds the database. shortcut: no onboarding check yet; TASK-7 adds it.

## Tests
- AC1 e2e: /dashboard sidebar has exactly 3 links (Applications, Knowledge base, Settings) and the active one has aria-current; body background is #F3F2EE and the font family matches /Schibsted/i. Manual: `ss -ltn` shows the dev server only on 127.0.0.1.
- AC2 e2e: each of /onboarding, /import, /dashboard, /kb/roles, /settings, /new, /new/quick, /new/studio, /projects/sample renders its h1 inside the full sidebar, except /projects/sample (compact sidebar) and /onboarding/manual (no sidebar); / lands on /dashboard; /kb/unknown is a 404. At 390px the nav is a bottom bar with no horizontal scroll.
- Playwright runs against pnpm build && pnpm start, so prerendering can't hide a missing nonce; PW_CHROMIUM env var points at /usr/bin/chromium locally if the bundled browser won't run.
- AC3: pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e all green (output shown).
- AC4 e2e: the /dashboard response has a CSP header with a nonce, the 3 provider hosts in connect-src and no 'unsafe-inline' in script-src; visiting every route logs no CSP violations or console errors.
- AC5 unit: checkStartup passes for an unset HOST, 127.0.0.1, 127.1.2.3, ::1 and localhost. It fails for 0.0.0.0 or 192.168.1.5 without APP_PASSWORD, and for an 11-character password. It passes for a non-loopback host with a 12-character password. The message names HOST and APP_PASSWORD. Integration: HOST=0.0.0.0 with both next dev and next start exits non-zero and prints the message.

## Out of scope
Access gate, unlock page and cookie (TASK-2); database (TASK-3); motion tokens, view transitions, tooltips, toasts and components beyond what shadcn init adds (TASK-32); model picker (TASK-10); real page content; dev-only demo controls; Docker.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scaffold done: Next.js 16 app shell, tokens, every route stubbed, per-request CSP nonce (proxy.ts), startup refusal of unsafe HOST/APP_PASSWORD, Vitest + Playwright on the production build.
Review fixed: phone nav links now named (sr-only labels, tested); unused x-nonce header removed. Known shortcut: startup check reads only the HOST env var.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-16T00:38:00Z

---

Built. typecheck, lint, 16 unit and 7 e2e tests green against pnpm build && pnpm start. Mutation check: removing connection() from app/layout.tsx makes the route test fail with CSP violations. Manual: dev listens only on 127.0.0.1, LAN request refused. Notes: shadcn owns --accent/--muted, so SPEC teal is --primary and muted text --muted-foreground (documented in globals.css, AGENTS.md); global reduced-motion rule and motion tokens arrive with TASK-32; next dev appends a Next.js docs block to AGENTS.md, committed so it stays put.

---
<!-- COMMENTS:END -->
