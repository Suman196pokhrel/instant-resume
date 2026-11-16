---
id: TASK-16
title: Rewrite a section with an instruction
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:51:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can ask for one section to be rewritten and review the change before accepting it. Refs: SPEC §8.3, US7, §18.4 #7.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An instruction sends only the selected section and gets back JSON Patch operations for that section
- [ ] #2 The proposal shows a word diff, tagged when content comes from the knowledge base
- [ ] #3 Accept applies it and Reject leaves the section untouched; both work for cover letter paragraphs
- [ ] #4 A no-change result shows the §8 message with a different example instruction
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
