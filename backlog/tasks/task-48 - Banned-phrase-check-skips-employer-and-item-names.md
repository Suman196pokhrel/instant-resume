---
id: TASK-48
title: Banned-phrase check skips employer and item names
status: Done
assignee: []
created_date: '2026-11-18T11:50:00Z'
updated_date: '2026-11-20T02:27:00Z'
labels: []
dependencies: []
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The rules engine scans each section's full text, item headings included, so an employer named e.g. 'Dynamic Logistics' raises a banned-phrase finding the user can't fix. Scan only bullets, lines and text. Same in mock docs.js. Found in TASK-20 review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Banned phrases are checked only in text the user can change: summary and paragraph text, bullets and skills lines; headings, employers, item names and dates never raise one (app and mock)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
lib/checks/run.ts: scan 'text' or items' line + bullet texts instead of sectionText. mock/js/docs.js: same. Unit test in checks.test.ts: employer 'Dynamic Logistics' and portfolio name 'Passionate Paws' raise nothing; the same word in a bullet does.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Banned-phrase scan covers text, bullets and skills lines only (lib/checks/run.ts, mock docs.js); headings/employers/names skipped. Unit test in checks.test.ts.
<!-- SECTION:NOTES:END -->
