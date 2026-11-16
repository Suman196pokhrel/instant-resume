---
id: TASK-24
title: Quick generate pipeline and progress
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:18:00Z'
labels:
  - m9
dependencies:
  - TASK-32
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I paste a job description and watch a 5-stage pipeline produce finished documents. Refs: SPEC §14.3, QG, §18.1 Pipeline, §18.2 Quick generate progress, §18.4 #3–5. Mock: views-quick.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The 5 stages each show pending, active, done, warning and error states, driven by pipeline events with live partial results
- [ ] #2 The overall bar and elapsed time are shown, progress is monotonic, and stage changes are announced
- [ ] #3 Cancel stops the run, keeps the text, and creates no project
- [ ] #4 An error shows Retry from this step, which completes the run, and Start over keeps the text
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
