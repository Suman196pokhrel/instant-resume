---
id: TASK-29
title: Setup checklist, responsive layout and accessibility pass
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:18:00Z'
labels:
  - m10
dependencies:
  - TASK-32
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
- [ ] #5 A side-by-side review of every screen against the mock (motion, tooltips, toasts, empty and error states) finds no inconsistencies
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
