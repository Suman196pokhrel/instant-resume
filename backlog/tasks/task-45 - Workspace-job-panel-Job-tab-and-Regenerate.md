---
id: TASK-45
title: 'Workspace job panel: Job tab and Regenerate'
status: To Do
assignee: []
created_date: '2026-11-18T09:34:00Z'
labels:
  - m6
dependencies:
  - TASK-15
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I see the job beside my documents: requirements reflected, keywords matched, my notes (editable) and the full ad, and I can regenerate both documents. Refs: SPEC §14.5 Job panel, Job tab and Regenerate dialog. Split from TASK-15.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Job tab shows role, company · location, Requirements '{m} of {n} reflected' with reflected / not reflected / unmarked marks, and Keywords '{m} of {n} in this {document}' as chips
- [ ] #2 Your notes are editable and autosave to the project; the Job description is a collapsible full ad
- [ ] #3 Regenerate opens the SPEC dialog; confirming regenerates both documents (one call), keeps each theme and adds a revision
- [ ] #4 The preview bar toggles the job panel; below 1180px it starts closed
<!-- AC:END -->
