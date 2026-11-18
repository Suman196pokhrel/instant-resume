---
id: TASK-22
title: History drawer and restore
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T12:23:00Z'
labels:
  - m8
dependencies:
  - TASK-32
  - TASK-33
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can look at earlier versions and restore one. Refs: SPEC §14.5 History, §18.4 #9.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The drawer lists revisions with labels and times
- [x] #2 Previewing an old revision locks the inspector
- [x] #3 Restoring adds a new revision instead of deleting later ones
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- A "History" quiet button in the bar's tool group (after Copy) opens new components/workspace/HistoryDrawer.tsx.
  - It's a 360px panel sliding in from the right over the inspector (translate, --t-slow; mock .drawer).
  - role="dialog" with aria-label History, but not modal, so the preview banner stays usable.
  - Focus goes to Close; Escape or × closes it and returns focus to the History button.
- The rows come from GET /api/documents/{id}/revisions (newest first). The list is fetched when the drawer opens, when the document switches, and whenever saving settles while it is open.
  - Each row has a kind icon, the label (2 lines), and the time from a new clockTime ("Today, 10:42 am" or "18 Nov, 10:42 am"), plus ", used the LLM" for generation and rewrite.
  - The newest row has a "Current" pill.
  - Selecting an older row previews it; selecting the newest goes back to current.
- Store:
  - New state viewing: Revision | null; view(rev | null).
  - restore() copies the snapshot's sections, theme and recipient through commit, as {kind: "restore", label: "Restored the version from {clockTime}"} with an undo step. It clears viewing and the selection, and toasts "Restored. The version you replaced is still in history."
  - setKind and closing the drawer clear viewing. Undo (button and Ctrl+Z) is off while viewing.
- Preview:
  - While viewing, it renders viewing.snapshot without the proposal overlay.
  - A sticky dark banner (bg-ink) reads "Viewing the revision from {time}: {label}", with "Restore this version" (primary) and "Back to current" (ghost on dark).
- Inspector lock: while viewing, the inspector is inert, with an overlay below its tabs reading "You're viewing an older revision. Restore it or go back to the current version to edit."

Files
- new components/workspace/HistoryDrawer.tsx
- Workspace.tsx (button, drawer, lock overlay, undo guard)
- Preview.tsx (snapshot and banner)
- lib/stores/workspace.ts
- lib/time.ts (clockTime)

Tests
- Unit:
  - clockTime: today, another day.
  - store: view sets viewing and drops a proposal; setKind clears it; restore saves a restore revision with the snapshot's sections and theme, pushes an undo step and clears viewing; undo does nothing while viewing.
- E2E (tests/e2e/history.spec.ts):
  - AC1: after a structure move, History lists "Moved Summary down" (Current) above "Generated from job brief", with "Today, …" and ", used the LLM" on the generation. Escape closes it and focus returns.
  - AC2:
    - Selecting the generation shows the banner with its label, and the inspector shows the lock text and is inert (its buttons can't be focused).
    - Back to current removes both.
    - Closing the drawer while viewing leaves preview mode.
  - AC3: Restore toasts the message. The revisions API then has one more revision (kind restore, newest) and still holds the move. The drawer shows the restore as Current.

Out of scope
- Diffing revisions, and deleting or naming them
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
History drawer (components/workspace/HistoryDrawer.tsx) lists revisions from the API with kind icons, clockTime and Current; viewing shows the snapshot with a sticky banner and an inert, overlaid inspector; restore commits a restore revision with undo (lib/stores/workspace.ts view/restore).
Review: regenerate now leaves preview mode; drawer visibility flips at once on open so focus lands. 302 unit, 110 e2e pass.
<!-- SECTION:NOTES:END -->
