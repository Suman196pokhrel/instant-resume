---
id: TASK-1
title: Scaffold the app, shell and tooling
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
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
- [ ] #1 pnpm dev serves the app on 127.0.0.1 with the sidebar showing exactly Applications, Knowledge base and Settings, styled with the §11 tokens and Schibsted Grotesk
- [ ] #2 Every route in §5 renders a stub page inside the right layout (shell, or compact sidebar for /projects/[id])
- [ ] #3 pnpm typecheck, lint, test and test:e2e each pass, with one Vitest and one Playwright smoke test
- [ ] #4 Responses carry the §4 Content-Security-Policy header
- [ ] #5 Startup refuses a non-loopback HOST without APP_PASSWORD, and an APP_PASSWORD under 12 characters, with a clear message
<!-- AC:END -->
