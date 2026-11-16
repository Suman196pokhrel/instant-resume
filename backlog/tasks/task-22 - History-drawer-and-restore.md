---
id: TASK-22
title: History drawer and restore
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:51:00Z'
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
- [ ] #1 The drawer lists revisions with labels and times
- [ ] #2 Previewing an old revision locks the inspector
- [ ] #3 Restoring adds a new revision instead of deleting later ones
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
