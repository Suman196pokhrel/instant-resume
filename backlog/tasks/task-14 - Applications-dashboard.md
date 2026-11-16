---
id: TASK-14
title: Applications dashboard
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:51:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can see my saved applications and reopen one. Refs: SPEC §13.1, US3, §18.4 #12. Mock: views-app.js dashboard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cards show company, role and last edited, and clicking one opens its Workspace
- [ ] #2 With no applications, the dashed box shows 'No applications yet' with a New application button
- [ ] #3 Deleting an application asks for confirmation and removes it
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
