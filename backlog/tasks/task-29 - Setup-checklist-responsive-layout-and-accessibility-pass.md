---
id: TASK-29
title: Setup checklist, responsive layout and accessibility pass
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m10
dependencies: []
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As any user, the app guides my first run and works by keyboard, at phone width and with reduced motion. Refs: SPEC §12, §16, §18.4 #13, §20 local app acceptance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A fresh install shows the setup checklist at '0 of 3 done'; each step ticks as completed, and it can be dismissed
- [ ] #2 Main flows have no console errors and no horizontal scroll at phone width
- [ ] #3 Reduced motion disables transitions, and an automated axe check of main screens passes
- [ ] #4 The full e2e suite (§18.4) passes from a fresh clone
<!-- AC:END -->
