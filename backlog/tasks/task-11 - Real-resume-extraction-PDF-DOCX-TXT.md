---
id: TASK-11
title: Real resume extraction (PDF, DOCX, TXT)
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:51:00Z'
labels:
  - m3a
dependencies:
  - TASK-32
  - TASK-33
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a new user, I can upload my PDF or DOCX resume and have my provider extract it into the review draft. Refs: SPEC §1.4, §14.1a, M3a. Needs the LLM adapter.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PDF and DOCX text is extracted locally and sent to the selected provider only after the data transfer is explained
- [ ] #2 Extraction results land in the same review draft as TXT import, with missing facts left blank (work rights never inferred)
- [ ] #3 Unknown content is preserved as Additional sections
- [ ] #4 Scanned or unreadable files and provider failures show a clear reason and a retry
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
