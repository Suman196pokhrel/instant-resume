---
id: TASK-59
title: Page fitting never changes a number when it shortens text
status: Done
assignee: []
created_date: '2026-11-20T03:04:00Z'
updated_date: '2026-11-20T03:04:00Z'
labels: []
dependencies: []
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Live run 2026-11-20: the summary '1.5 years at Harbour Health … Earlier …' became '5 years at Harbour Health …' after fitting. The sentence splitter in lib/generate/fit.ts can't cross a '.', so it dropped the '1.' of '1.5'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shortening keeps every sentence it keeps exactly as written: decimals (1.5, 4.2s), and text without a final full stop, are never cut
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
fit.ts sentences() splits on [.!?] + whitespace; same in lib/llm/mock.ts and mock docs.js. Unit test with 1.5 / 4.2s. Found live: '1.5 years at Harbour Health' had become '5 years'.
<!-- SECTION:NOTES:END -->
