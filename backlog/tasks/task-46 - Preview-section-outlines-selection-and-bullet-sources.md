---
id: TASK-46
title: Preview section outlines, selection and bullet sources
status: To Do
assignee: []
created_date: '2026-11-18T09:34:00Z'
updated_date: '2026-11-18T11:54:00Z'
labels:
  - m6
dependencies:
  - TASK-15
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I see which section I'm editing in the preview and, hovering a bullet, the knowledge base fact it came from. Refs: SPEC §14.5 Preview, §9.1 (Typst query of labelled section positions). Split from TASK-15.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sections in the preview show the hover outline and the selected outline (2px accent), positioned from Typst-labelled section positions
- [ ] #2 Selecting a section scrolls the preview to it and flashes it
- [ ] #3 In the selected resume section, hovering a bullet shows 'From your knowledge base' and the highlight text, or 'No source found'
- [ ] #4 Clicking a section in the preview selects it (SPEC §9.1 nice-to-have; skip if positions make it unreliable)
- [ ] #5 Hovering a bullet that a grounding finding points at shows 'Differs from your knowledge base' in amber, with the source text (moved from TASK-21)
- [ ] #6 A Checks finding's Go to {section} scrolls the preview to it and flashes it (moved from TASK-21)
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T10:21:00Z

---

From TASK-16: while a rewrite runs the selected section in the preview should shimmer; while a proposal is pending it shows the 'Proposed' styling (the preview already renders pending.after, see Preview.tsx); Accept flashes the section (SPEC §14.5 Proposal card).

---

created: 2026-11-18T11:54:00Z

---

Received AC from TASK-21 (Checks panel); runChecks findings carry bulletId.

---
<!-- COMMENTS:END -->
