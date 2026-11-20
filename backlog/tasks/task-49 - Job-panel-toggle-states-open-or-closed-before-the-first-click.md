---
id: TASK-49
title: Job panel toggle states open or closed before the first click
status: Done
assignee: []
created_date: '2026-11-18T12:07:00Z'
updated_date: '2026-11-20T02:27:00Z'
labels: []
dependencies: []
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The preview-bar toggle has aria-expanded only once clicked: the default (open from 1180px, CSS) isn't announced. Read matchMedia with useSyncExternalStore so aria-expanded is always set on the client. Found in TASK-45 review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The job panel toggle has aria-expanded from the first render on the client: true from 1180px wide, false below, and it follows the window crossing 1180px until the user toggles
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Preview.tsx: useSyncExternalStore on matchMedia('(min-width: 1180px)') (server snapshot null); shown = leftOpen ?? wide drives aria-expanded and the toggle. e2e job-panel.spec: aria-expanded true before any click at 1280, false at 1100, flips with each click.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Preview reads (min-width: 1180px) with useSyncExternalStore; aria-expanded = leftOpen ?? wide from the first client render. e2e job-panel.spec asserts it before and after clicks at 1280 and 1100.
<!-- SECTION:NOTES:END -->
