---
id: TASK-60
title: Motion and tooltip parity with the mock
status: Done
assignee: []
created_date: '2026-11-20T08:53:00Z'
updated_date: '2026-11-20T08:53:00Z'
labels: []
dependencies: []
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fast lane: compare SPEC §12 motion and the mock's tooltips with the app; add what's missing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Quick generate chips and result thumbnails enter with qgIn, staggered; the page count ticks on each change
- [x] #2 The Workspace title shows its full text in a tooltip, as in the mock
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Audited every SPEC §12 row and every mock data-tip. Gaps found and fixed: chip stagger (45 ms), result thumbnail stagger (80 ms), page-count tick, Workspace title tooltip. Rest already matched. Checks: typecheck, lint, 359 unit, 147 e2e pass.
<!-- SECTION:NOTES:END -->
