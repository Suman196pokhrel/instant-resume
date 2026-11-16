---
id: TASK-28
title: Unlock screen and Settings → Access
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:18:00Z'
labels:
  - m10
dependencies:
  - TASK-32
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a self-hoster, I unlock my install from a clear screen and can lock it again from Settings. Refs: SPEC §4.1, §13.3, §18.4 #16. Mock: Views.unlock and Settings → Access.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Empty and wrong passwords show their errors
- [ ] #2 The 5th failure shows a countdown with Unlock disabled
- [ ] #3 The right password lands on the originally requested page
- [ ] #4 Settings → Access shows 'Password lock is on', and Lock now returns to the unlock screen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
