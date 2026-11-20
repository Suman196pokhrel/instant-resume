---
id: TASK-44
title: ui.spec tooltip timing tests flake under full e2e load
status: Done
assignee: []
created_date: '2026-11-18T09:08:00Z'
updated_date: '2026-11-20T02:32:00Z'
labels: []
dependencies: []
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seen 2026-11-18 (TASK-43): tooltips (AC2) 'show after 150ms…' and 'keyboard focus shows the tooltip' failed in 1 of 4 full runs (another run failed one toBeVisible); they pass 30/30 alone. Studio generate tests now render Typst in parallel. Consider looser timing or running ui.spec serially.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tooltip tests keep checking the 150 ms delay, the warm window and closing, but waits for an element to appear or go allow for a loaded machine
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
ui.spec: the delays are measured inside the page (MutationObserver), so keep those bounds but give them headroom that still tells 150 ms apart from Base UI's 600 ms default (first < 500, warm < 130). Waits for visible/gone use 2 s instead of 400–600 ms. Verify: full e2e twice.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ui.spec: waits 2 s; measured bounds first <500 ms (vs 600 default), warm <130 ms. Three full e2e runs green (145 passed each).
<!-- SECTION:NOTES:END -->
