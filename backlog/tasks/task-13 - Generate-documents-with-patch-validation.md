---
id: TASK-13
title: Generate documents with patch validation
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m5
dependencies: []
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I get a tailored resume and cover letter built only from my chosen entries, with every bullet traced to a highlight. Refs: SPEC §8.3, §18.1 Skeleton builder and Patch validator, US4.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The skeleton uses only the selected entries, in section order, omitting empty sections
- [ ] #2 Every generated bullet carries a valid source highlight ID; unknown or cross-entry sources are rejected
- [ ] #3 The patch validator rejects paths outside the target section and changes to id, kind, hidden, theme or order, and mutates nothing on rejection
- [ ] #4 Generation creates a project and opens the Workspace with the rendered preview
<!-- AC:END -->
