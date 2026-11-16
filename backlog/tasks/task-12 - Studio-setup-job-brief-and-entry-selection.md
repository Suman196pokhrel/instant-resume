---
id: TASK-12
title: 'Studio setup: job brief and entry selection'
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m5
dependencies: []
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
