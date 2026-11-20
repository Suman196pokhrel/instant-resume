---
id: TASK-56
title: Page fitting keeps a two-sentence summary
status: Done
assignee: []
created_date: '2026-11-20T02:57:00Z'
updated_date: '2026-11-20T02:58:00Z'
labels: []
dependencies: []
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner's bug list: after fitting, generated summaries were sometimes one thin sentence. The fit loop cut the summary to one sentence before trying one bullet per role.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The fit loop shortens the summary only down to two sentences; cutting it to one is the very last 1-page step, after one bullet per role
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
lib/generate/fit.ts: shortenSummary keeps 2 sentences; new last 1-page step 'Shortening the summary to one sentence' after one bullet per role. Unit tests in fit.test.ts.
<!-- SECTION:NOTES:END -->
