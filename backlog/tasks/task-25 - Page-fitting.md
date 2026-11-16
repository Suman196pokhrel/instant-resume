---
id: TASK-25
title: Page fitting
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:51:00Z'
labels:
  - m9
dependencies:
  - TASK-32
  - TASK-33
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, my resume fits my page budget without me fiddling with spacing. Refs: SPEC §9.4, §18.1 Page fit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The fit loop reaches the budget within 8 iterations against a fake compiler, adjusting in order and respecting floors
- [ ] #2 With a one-page budget, it then hides Portfolio, Certifications and Referees
- [ ] #3 It warns when it can't fit, and emits the expected pages events
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
