---
id: TASK-19
title: Revisions and undo
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T11:07:00Z'
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
