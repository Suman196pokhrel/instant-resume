---
id: TASK-61
title: Instant, smooth preview while editing
status: Done
assignee: []
created_date: '2026-11-20T09:20:00Z'
updated_date: '2026-11-20T09:20:00Z'
labels: []
dependencies: []
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As the owner, I want edits and design changes to show on the page as I type, without the preview lagging or the page stuttering.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Typing shows on the page within a frame or two, with no fixed debounce
- [x] #2 A new render is patched into the SVG on screen and matches a fresh render exactly
- [x] #3 No long tasks while typing at 4x CPU throttle; input-event p95 no worse than before
- [x] #4 The render status flashes once renders settle, never on every key
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Measured on a full 1-page resume. The worker compiles an edit in ~2-6 ms (Typst caches); the lag was the 120 ms debounce plus a full swap of ~2,700 SVG nodes (~80 ms at 4x). Now: no debounce (one render at a time, newest wins, a frame between renders); lib/render/patch.ts patches the new SVG in place, keyed by Typst's data-tid content hash and glyph ids (a matched node still takes its own attributes: the hash leaves out its transform). Keystroke to page: 155 -> ~20 ms (4x: 220 -> ~60 ms); 4x typing renders on every key with no long tasks (was 1 render at the end); input p95 48 ms unchanged; colour drag 200 -> 100 ms per update (5 updates per 0.6 s drag, no long tasks). Status flash after 250 ms quiet (SPEC §12). e2e: patched SVG equals a fresh render after a reflowing edit, a bullet edit, an accent and a font change.
<!-- SECTION:NOTES:END -->
