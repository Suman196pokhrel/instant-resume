# Explore: Instant Resume

Explore was done through the spec and the mock. `docs/SPEC.md` is the source of truth; this page only points into it.

## Problem
Tailoring a resume and cover letter for each job is slow, and AI tools invent claims. Instant Resume turns a pasted job description plus a stored knowledge base into an ATS-friendly resume and cover letter, where every bullet traces to a stored fact (SPEC §1.1).

## Users
Students and job seekers who run the app on their own machine (or a private server) with their own AI provider key (SPEC §1.1, §22). Also a public portfolio piece, built in public.

## Success
§20 acceptance criteria (US1–US12, Quick generate, local app, public demo). From a fresh clone, `pnpm install && pnpm db:migrate && pnpm dev` works, and `pnpm typecheck`, `lint`, `test` and `test:e2e` all pass.

## Constraints
- Local-first and bring-your-own-key. Keys never leave the browser except to the provider. Design changes never call the LLM (SPEC §1.1).
- Licence: PolyForm Noncommercial 1.0.0, never changed. Synthetic fixtures only. No publishing or deploying without the owner's approval (§3.1, §23.3).
- Australian defaults, single-column templates only (§3).
- `mock/` is the reference for visuals and interactions. When they disagree, SPEC wins.

## Stack, run and test
- Locked stack (§3):
  - Next.js App Router with TypeScript strict
  - Tailwind v4, shadcn
  - SQLite via libSQL, with Drizzle
  - Zod, Zustand, React Hook Form, dnd-kit
  - Vercel AI SDK (client side)
  - typst.ts WASM in a Web Worker
  - Vitest and Playwright, managed with pnpm
- Structure (§5): the Next.js app lives at the repo root, alongside `mock/` and `docs/`.
- Today only the mock runs: `xdg-open mock/index.html`. The pnpm scripts (`dev`, `build`, `start`, `db:migrate`, `db:seed`, `test`, `test:e2e`, `lint`, `typecheck`) arrive with M0.

## Risks and unknowns
- **Typst in WASM:** compile time (target under 300 ms) and PDF text order. This is the M2 spike, done early.
- **Browser-direct provider calls:** CORS for OpenAI, Anthropic and Gemini (M4).
- **Upgraded packages:** some locked packages have moved on since the spec was written. Check each against its official docs at the spec stage:
  - Next 16 calls middleware `proxy.ts`
  - AI SDK 7's structured-output API (`generateObject`)
  - Zod 4
  - Vitest 5
- **Real resume extraction quality:** PDF and DOCX (M3a).

## Open questions
- Containers: the spec has none. A Dockerfile for private-server self-hosting has to bind a non-loopback host, so it needs `APP_PASSWORD` and TLS (§4.1). Parked until the owner decides.

## Non-goals
- **Removed for good (§21):**
  - job scraping and discovery
  - matching inbox and source connections
  - sweeps and schedulers
  - batch generation
  - listing-trust scores
  - outreach and contact discovery
  - application-stage tracking
  - career maps, hiring funnels and timing analytics
  - resume experiments
- **Also out of scope:**
  - paid plans
  - managed hosting of the real app and live public AI
  - sync, accounts, sign-up and password reset (the single-user lock is in scope)
  - multi-column layouts
  - more than one template per document kind
  - DOCX or other export formats (DOCX import is in scope)
  - LinkedIn, MCP and chat-app integrations
  - interview-style onboarding
  - dark mode
- **No cloud infrastructure, auth services, billing or background job services (§1.6).** The browser must stay open during generation.
