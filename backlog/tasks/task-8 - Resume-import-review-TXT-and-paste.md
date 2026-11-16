---
id: TASK-8
title: Resume import review (TXT and paste)
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m3
dependencies: []
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a new user, I can paste my existing resume or upload a TXT file, review what was found, and choose to merge or replace, so I don't type everything again. Refs: SPEC §1.4, §14.1a, §18.5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pasted text or a TXT upload opens a review draft, and nothing is saved before the user confirms
- [ ] #2 Unrecognised sections are kept as Additional sections, and the original text is kept as reference-only
- [ ] #3 Merge adds entries and keeps existing contact and work-rights details; replace swaps the KB; existing documents survive both
- [ ] #4 Abandoning the draft leaves the saved KB unchanged; invalid, empty and oversized files show clear errors
<!-- AC:END -->
