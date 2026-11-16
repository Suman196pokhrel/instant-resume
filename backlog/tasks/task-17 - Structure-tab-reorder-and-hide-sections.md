---
id: TASK-17
title: 'Structure tab: reorder and hide sections'
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:51:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can reorder and hide sections without losing them. Refs: SPEC US6, §18.2 Structure tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sections reorder by drag and by Alt+ArrowUp/Down, with a screen reader announcement
- [ ] #2 A hidden section disappears from the preview but stays listed as Hidden and can be shown again
- [ ] #3 No structure change calls the LLM
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
