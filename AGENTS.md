# Agent guide

Instant Resume: a source-available (PolyForm Noncommercial 1.0.0), local-first (own machine or private server; no hosted platform), bring-your-own-key app that turns a pasted job description plus a stored knowledge base into a tailored resume and cover letter.

## Read this first

**[`docs/SPEC.md`](docs/SPEC.md) is the single source of truth**: scope, stack, schemas, routes, LLM contract, rendering, rules engine, design tokens, flows, tests, acceptance criteria and repository rules. Start with §1 (scope and modes), §19 (milestones M0–M11, build in order) and §20 (definition of done). `mock/` is the reference for interactions and visuals; when they disagree, SPEC.md wins.

## Current state

- The Next.js app (M0 scaffold) lives at the repo root: `app/`, `components/`, `lib/`, `tests/`, `proxy.ts` (CSP nonce; later the access gate), `instrumentation.ts` (startup check).
- Run it: `pnpm install && pnpm dev` (binds `127.0.0.1:3000`). Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright, builds and serves on port 3100; first run needs `pnpm exec playwright install chromium`).
- Data: `pnpm db:migrate` creates `./data/instant-resume.db` (the app also migrates on first use); `pnpm db:seed` loads the synthetic Jordan Whitlock KB and refuses to overwrite one without `--force`. `IR_DB_URL` (a libSQL URL) points the app and scripts at another database; the e2e server uses a seeded one in the OS temp folder. `/dev/render` (like `/dev/ui`) compiles the sample resume with Typst; `/dev/llm` makes one structured call to a real provider.
- LLM: every call goes through `lib/llm/adapter.ts` (`getAdapter()`); `NEXT_PUBLIC_LLM_MOCK=1` (set for the e2e build) swaps in the deterministic mock (`lib/llm/mock.ts`, fixtures keyed by call name). Show failures with `components/llm/LlmErrorCallout`. A large output schema needs `jsonInPrompt: true` (Anthropic rejects big strict grammars). If `pnpm dev` ever reloads pages in a loop, stop it and delete `.next/dev` (a stale Turbopack dev cache; TASK-42). Model IDs live in `lib/llm/providers.ts`; when a provider retires one, update it there and in `mock/js/data.js`. Opt-in real-provider check: put keys in `.env.keys` (gitignored, never loaded by Next.js, never committed), then `set -a; . ./.env.keys; set +a; pnpm test:e2e tests/e2e/cors.spec.ts`.
- `mock/`: the static interactive demo with simulated AI; the visual reference. Run it: `xdg-open mock/index.html`.
- Build plan: Smart Dev board in `backlog/` (`backlog task list --plain`), session state in `.smartdev/STATE.md`.
- Shared UI: `components/ui` (shadcn on Base UI, restyled to SPEC §11.5; keep shadcn's built-in animations, custom motion only where SPEC §12 says), `lib/toast.ts` (use instead of sonner directly), `lib/motion.ts`. See them all at `/dev/ui` in `pnpm dev`. `tests/unit/tokens-guard.test.ts` fails on raw colours, durations or easings.
- Tokens: SPEC `--accent` is `--primary` and SPEC `--muted` text is `--muted-foreground` in `app/globals.css` (shadcn owns those names).

## Non-negotiables (details in SPEC.md)

- One workflow only: knowledge base (manual or import, reviewed before save) → new application from a pasted job description → Quick generate or Studio → edit, check, export. Navigation: Applications, Knowledge base, Settings.
- Removed features never return (SPEC §21): scraping and discovery, sweeps and schedulers, matches inbox, career maps and analytics, resume experiments, listing-trust checks, outreach, application-stage tracking.
- Every resume bullet traces to a knowledge base highlight ID. Design changes never call the LLM. API keys stay in the browser.
- Keep the two modes apart: the local app makes real provider calls and uses SQLite; the public demo (`mock/` on Cloudflare: `cd mock/feedback-worker && npx wrangler deploy`) is static, simulated and must never collect real keys; its only server code is the visitor-feedback endpoint, stored in D1.
- Australian defaults (A4, AU spelling, work-rights line, referees); single-column templates only.
- UI quality is part of done, not a later pass: every screen matches the mock's layout, copy, states and motion, and uses only the shared tokens and components (SPEC §11–12). No one-off colours, durations or easings; keyboard, focus and reduced motion work.
- Update SPEC.md and the mock in the same commit as any behaviour change. Synthetic fixtures only. Never change the licence or invent a domain or hosting project, and never publish or deploy without explicit approval.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
