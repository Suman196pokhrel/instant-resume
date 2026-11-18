---
id: TASK-46
title: Preview section outlines, selection and bullet sources
status: To Do
assignee: []
created_date: '2026-11-18T09:34:00Z'
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
<!-- AC:END -->
