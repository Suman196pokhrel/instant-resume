---
id: TASK-12
title: 'Studio setup: job brief and entry selection'
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:51:00Z'
labels:
  - m5
dependencies:
  - TASK-32
  - TASK-33
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can paste a job description, review the extracted brief, and choose which entries to use before generating. Refs: SPEC §14.4, §6.2, §8.3. Mock: views-new.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 New application offers Quick generate (primary) and Studio; Generate is disabled until there is text
- [ ] #2 The brief shows requirements, nice-to-haves and keywords, each keyword marked backed or not backed by the KB, and keywords can be removed
- [ ] #3 Suggested entries are preselected, with a live 'Covers n of m keywords' count
- [ ] #4 Optional notes for the application are saved with the project
- [ ] #5 A failed extraction shows the reason, and Retry works without pasting again
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
