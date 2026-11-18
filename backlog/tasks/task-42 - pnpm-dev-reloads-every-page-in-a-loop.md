---
id: TASK-42
title: pnpm dev reloads every page in a loop
status: Done
assignee: []
created_date: '2026-11-18T07:56:00Z'
updated_date: '2026-11-18T08:07:00Z'
labels: []
dependencies: []
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seen 2026-11-18 while live-testing TASK-11: under pnpm dev (Turbopack, PORT=3123, temp IR_DB_URL), every page (/dashboard, /kb/roles, /settings, /import, /dev/ui) does about 7 full reloads a second in headless Chromium. Each reload logs 'Compiled in 2ms' on the server and '[Fast Refresh] rebuilding' in the browser. No source file changes while it loops, and an idle server stays quiet. Production builds (pnpm build && pnpm start, the e2e server) don't loop. Suspects: HMR with the per-request CSP nonce in proxy.ts, or the dev CSP for the HMR websocket. Not yet checked in a normal (headed) browser or on the commit before TASK-10.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm dev serves pages without a reload loop
- [x] #2 The cause and fix are noted on the card
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Not reproducible after the production build regenerated .next: 4 pages x 6 s under pnpm dev gave the normal 2 navigations each and zero server rebuilds (it was ~7 reloads a second before). Likely cause: a stale Turbopack dev cache in .next/dev (not proven). Workaround in AGENTS.md: stop dev, delete .next/dev.
<!-- SECTION:NOTES:END -->
