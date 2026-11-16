---
id: TASK-6
title: Knowledge base screen
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m3
dependencies: []
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can browse and edit every entry in my knowledge base by section, so it stays accurate. Refs: SPEC §1.4, §13.2, §6.1. Mock: views-app.js KB_SCHEMA and KB_ORDER.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /kb/[section] lists the entries for each KB section in KB_ORDER
- [ ] #2 Adding, editing and deleting an entry or highlight saves it and survives a reload
- [ ] #3 Inline validation shows field errors and moves focus to the first one
- [ ] #4 Volunteer work and additional sections are supported, and no paid role is required
<!-- AC:END -->
