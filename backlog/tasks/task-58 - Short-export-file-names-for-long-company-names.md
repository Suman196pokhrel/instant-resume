---
id: TASK-58
title: Short export file names for long company names
status: Done
assignee: []
created_date: '2026-11-20T03:01:00Z'
updated_date: '2026-11-20T03:02:00Z'
labels: []
dependencies: []
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Real run 2026-11-20: 'Jordan-Whitlock-Resume-Tessellate-Allied-Health-Services-South-Australia-and-Northern-Territory-TAHS-SA-NT.pdf'. Long names are awkward in upload forms.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A company over 40 characters uses its short form in brackets when it has one (TAHS SA/NT), else is cut at a word boundary to 40 characters
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
lib/doc/filename.ts companyPart; mock docs.js same; unit tests.
<!-- SECTION:NOTES:END -->
