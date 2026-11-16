---
id: TASK-19
title: Revisions and undo
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m6
dependencies: []
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can undo any change and rely on automatic revisions. Refs: SPEC US11, §6.4, §18.1 Revisions and Undo stack.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Ctrl+Z undoes edits, rewrites, structure and design changes, with bursts grouped
- [ ] #2 The undo stack caps at 50
- [ ] #3 Revisions coalesce within 60 seconds per key, and a new one starts after that, with a readable label
<!-- AC:END -->
