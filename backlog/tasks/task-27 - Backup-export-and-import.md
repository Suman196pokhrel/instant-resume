---
id: TASK-27
title: Backup export and import
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T10:34:00Z'
labels:
  - m10
dependencies:
  - TASK-32
  - TASK-33
  - TASK-35
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can back up everything except my API keys and restore it later. Refs: SPEC §14.6, US12, §18.3, §18.4 #11.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One click exports the KB, projects and settings to a file
- [ ] #2 A deep scan of the export finds no connections, key or apiKey fields
- [ ] #3 Importing the file restores deleted projects and leaves the data unchanged
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:34:00Z

---

From TASK-6 spec: the KB top bar's Import backup and Export backup buttons (SPEC §13.2) are built here; TASK-6 leaves room for them next to Import resume.

---
<!-- COMMENTS:END -->
