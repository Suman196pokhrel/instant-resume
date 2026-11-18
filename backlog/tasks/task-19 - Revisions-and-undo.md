---
id: TASK-19
title: Revisions and undo
status: In Progress
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T11:14:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
  - TASK-35
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can undo any change and rely on automatic revisions. Refs: SPEC US11, §6.4, §18.1 Revisions and Undo stack.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Ctrl+Z undoes edits, rewrites, structure and design changes, with bursts grouped
- [ ] #2 The undo stack caps at 50
- [ ] #3 Revisions coalesce within 60 seconds per key, and a new one starts after that, with a readable label
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- Server coalescing (lib/db/projects.ts saveDocument): when the body's revision has a coalesceKey and the document's latest revision has the same key and is under 60 s old, update that revision (snapshot, ts, label) instead of inserting; otherwise insert. The response says which (revision id unchanged when coalesced).
- Undo stack in lib/stores/workspace.ts: per document kind, up to 50 steps { label, doc } (the document before the change). commit() pushes a step every time (rewrite Accept, structure, Reset); later() pushes only when its burst key (the coalesceKey) differs from the open burst or the burst is over 1.5 s idle, so a burst of typing or slider dragging is one step. undo() pops for the current kind, restores the document and saves it at once as { kind: "restore", label: "Undid: {label}" }, drops a pending proposal or running rewrite, clears the selection if that section no longer exists, and toasts "Undid: {label}".
- Labels: an undo step carries its revision label, so undo reads "Undid: Edited Summary", 'Undid: Rewrote Experience: "more concise"', "Undid: Moved Summary down" (SPEC §6.4 example updated from "Undid: Rewrite of Experience").
- One pending label per document (TASK-18 note): later() with a different coalesceKey than the save still waiting sends that one first, so each change keeps its own revision.
- UI: an Undo icon button starts the bar's tool group (before Copy), tooltip "Undo: {label} (Ctrl+Z)" or "Nothing to undo", disabled when empty. Ctrl/Cmd+Z does the same when focus isn't in a text field (input, textarea, contenteditable), so the browser's own text undo still works there. The rewrite Accept toast gets its Undo action (removes the TASK-16 shortcut).

Files
- lib/db/projects.ts, lib/stores/workspace.ts, components/workspace/Workspace.tsx (button, shortcut), components/workspace/Instruction.tsx (toast action)
- docs/SPEC.md §6.4 undo label example, §14.5 undo; mock undo labels to match (pushUndo uses the revision label)

Tests
- api (tests/api/projects.test.ts): two saves with the same key within 60 s give one revision with the second snapshot; after 60 s (fake clock) a new one; a different key or no key inserts
- unit store: a burst of edits to one section is one undo step, a pause over 1.5 s starts another; undo restores the previous document, saves "Undid: Edited Summary" as restore, toasts; rewrite, structure and Reset each push; the stack caps at 50 (51 moves, 50 undos, then nothing); per-kind stacks; an edit then a design change within the debounce send two PUTs with their own labels; undo drops a pending proposal
- e2e AC1: type in Summary, focus the preview, Ctrl+Z: Summary text restored, toast "Undid: Edited Summary", PUT kind restore; Undo button tooltip "Undo: Moved Summary down (Ctrl+Z)" after a Structure move, click undoes it; Accept a rewrite then the toast's Undo restores the section; Ctrl+Z inside a textarea doesn't trigger the app undo
- e2e: with nothing done the Undo button is disabled ("Nothing to undo")

Out of scope
- History drawer and restore (TASK-22), regeneration (TASK-45), redo (not in SPEC), undo surviving a reload (stack is in memory, as SPEC)
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:03:00Z

---

From the TASK-4 split: PUT /api/documents/:id (TASK-35) only appends revisions; coalescing by coalesceKey within 60 s is built here.

---

created: 2026-11-18T10:21:00Z

---

From TASK-16: the rewrite Accept toast 'Change applied to {title}' needs its Undo action, and Accept must push an undo step (shortcut comment in components/workspace/Instruction.tsx). Revisions: Accept saves kind rewrite, label 'Rewrote {title}: "{instruction}"', no coalesceKey (lib/stores/workspace.ts accept).

---

created: 2026-11-18T11:07:00Z

---

From TASK-18 review: lib/stores/workspace.ts keeps one pending revision label per document, so a hand edit followed within SAVE_DELAY by a design change (or an edit to another section) is saved as one PUT under the later label; content is kept, the earlier label is lost. Coalescing per key should give each its own revision.

---
<!-- COMMENTS:END -->
