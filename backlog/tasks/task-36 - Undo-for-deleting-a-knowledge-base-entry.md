---
id: TASK-36
title: Undo for deleting a knowledge base entry
status: Done
assignee: []
created_date: '2026-11-17T10:53:00Z'
updated_date: '2026-11-20T02:36:00Z'
labels: []
dependencies: []
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From TASK-6 review: Delete in the KB dialog removes an entry and all its highlights at once, with no confirm or Undo (same as the mock). The dashboard offers Undo for 6 s (SPEC §7.2); consider the same toast action for KB entries, and flag that documents may reference the deleted highlights (TASK-20).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deleting a KB entry shows 'Entry deleted' with Undo for 6 s; Undo puts it back where it was, with the same entry and highlight IDs, so documents that cite them stay sourced
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
DELETE /api/kb/:type/:id returns 200 { index } (the position it had). POST /api/kb/:type?at=N inserts at N (clamped) instead of appending; an entry whose id is already there is not added twice (200 with it). EntryDialog.remove: toast('Entry deleted', action Undo → POST ?at=index with the original entry, router.refresh, toast 'Entry restored'). SPEC §7.2 routes + §13.2. Tests: api kb.test (DELETE index, POST at, no duplicate), e2e kb.spec (delete then Undo restores in place and IDs).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
DELETE /api/kb/:type/:id returns {index}; POST ?at=N re-inserts (no duplicates); EntryDialog toast Undo restores in place with the same IDs. Mock + SPEC §7.2/§13.2. Tests: api kb.test, e2e kb.spec.
<!-- SECTION:NOTES:END -->
