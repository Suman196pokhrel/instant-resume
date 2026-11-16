---
id: TASK-23
title: Export PDF
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:51:00Z'
labels:
  - m8
dependencies:
  - TASK-32
  - TASK-33
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can save my resume and cover letter as PDFs with sensible file names. Refs: SPEC §9.3, US10, §18.4 #10.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The export dialog shows both file names (Firstname-Lastname-Resume-Company.pdf and the …-Cover-Letter-… one), with the company sanitised
- [ ] #2 The PDF downloads, its text is selectable, and the reading order starts with the name (asserted with pdf.js)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
