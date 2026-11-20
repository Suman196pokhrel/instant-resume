---
id: TASK-62
title: Preview ready sooner on first open
status: Done
assignee: []
created_date: '2026-11-20T09:26:00Z'
updated_date: '2026-11-20T09:26:00Z'
labels: []
dependencies: []
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As the owner, opening an application should show its preview quickly, and the wait (when there is one) should look intentional, not blank.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Applications list warms the renderer when idle, so opening an application skips the cold load
- [x] #2 The Typst loader shows only if loading takes a moment, its bar fills, and it fades out over the first page (SPEC §12)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Cold first preview ~1.6 s locally (28 MB compiler WASM + 6 MB fonts; ~14 MB gzipped). Dashboard (with an application) now warms the worker on requestIdleCallback; the worker also starts the SVG renderer after the compiler. Idle dashboard -> project: preview at ~0.8 s after the click (was ~1.6 s), of which ~0.47 s is the route itself; first render 157 -> 128 ms. Loader: appears after 200 ms, bar eases to 90% then full, card fades over the page with --t-slow and unmounts. Skipped: a warm-up compile of a sample document (would save ~100 ms on first render).
<!-- SECTION:NOTES:END -->
