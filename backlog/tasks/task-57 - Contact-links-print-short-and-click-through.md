---
id: TASK-57
title: Contact links print short and click through
status: Done
assignee: []
created_date: '2026-11-20T03:00:00Z'
updated_date: '2026-11-20T03:01:00Z'
labels: []
dependencies: []
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imports now carry full hyperlink addresses (TASK-55), so the resume header printed 'https://www.linkedin.com/in/…/' and wrapped (owner's real run, 2026-11-20).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The header and Copy as plain text show LinkedIn and GitHub without https://, www. or a trailing slash
- [x] #2 In the PDF, those two are clickable links to the full address
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
common.typ short()/web() and plain-text shortUrl. Tests: unit plain-text, e2e render.spec (link annotations). Live: owner's project re-exported with header on one line, links clickable, still 1 page.
<!-- SECTION:NOTES:END -->
