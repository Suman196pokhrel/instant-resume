# Agent guide

Resume Tailor: a source-available (PolyForm Noncommercial 1.0.0), local-first, bring-your-own-key app that turns a pasted job description plus a stored knowledge base into a tailored resume and cover letter.

## Read this first

**[`docs/SPEC.md`](docs/SPEC.md) is the single source of truth**: scope, stack, schemas, routes, LLM contract, rendering, rules engine, design tokens, flows, tests, acceptance criteria and repository rules. Start with §1 (scope and modes), §19 (milestones M0–M11, build in order) and §20 (definition of done). `mock/` is the reference for interactions and visuals; when they disagree, SPEC.md wins.

## Current state

- `mock/`: a static interactive demo with simulated AI. The real Next.js app has not been written yet: no package.json, build, lint or tests.
- Run the mock: `xdg-open mock/index.html` (works over `file://`, no server).
- Future scripts (pnpm): `dev`, `build`, `start`, `db:migrate`, `db:seed`, `test`, `test:e2e`, `lint`, `typecheck` (SPEC §5).

## Non-negotiables (details in SPEC.md)

- One workflow only: knowledge base (manual or import, reviewed before save) → new application from a pasted job description → Quick generate or Studio → edit, check, export. Navigation: Applications, Knowledge base, Settings.
- Removed features never return (SPEC §21): scraping and discovery, sweeps and schedulers, matches inbox, career maps and analytics, resume experiments, listing-trust checks, outreach, application-stage tracking.
- Every resume bullet traces to a knowledge base highlight ID. Design changes never call the LLM. API keys stay in the browser.
- Keep the two modes apart: the local app makes real provider calls and uses SQLite; the public Vercel demo is static, simulated and must never collect real keys.
- Australian defaults (A4, AU spelling, work-rights line, referees); single-column templates only.
- Update SPEC.md and the mock in the same commit as any behaviour change. Synthetic fixtures only. Never change the licence or invent a domain or Vercel project, and never publish or deploy without explicit approval.
