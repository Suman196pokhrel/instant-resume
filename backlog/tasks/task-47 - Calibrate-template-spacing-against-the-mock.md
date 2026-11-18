---
id: TASK-47
title: Calibrate template spacing against the mock
status: To Do
assignee: []
created_date: '2026-11-18T10:43:00Z'
labels:
  - m6
dependencies: []
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From TASK-15/TASK-18: the Typst resume and cover letter sit tighter than the mock (contact block, skills lines). Tune lib/render/templates/resume.typ and letter.typ so the default theme matches the mock's layout. Refs: SPEC §9.2, §11.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At the default theme the resume and cover letter preview match the mock's spacing (contact block, section headings, skills lines, bullets) side by side
- [ ] #2 The render tests and page counts still pass
<!-- AC:END -->
