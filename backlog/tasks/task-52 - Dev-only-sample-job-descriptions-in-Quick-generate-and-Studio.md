---
id: TASK-52
title: Dev-only sample job descriptions in Quick generate and Studio
status: Done
assignee: []
created_date: '2026-11-19T04:27:00Z'
updated_date: '2026-11-20T02:49:00Z'
labels: []
dependencies: []
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC §14.3 lists 'Use sample job description' (dev and demo only); the mock's Studio also offers 'Try a sample ad' chips. Neither exists in the app. Found in the TASK-29 side-by-side review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Quick generate shows 'Use sample job description' and Studio shows 'Try a sample ad' chips in development only; they fill the textarea with synthetic ads
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
lib/dev-samples.ts reads tests/fixtures/jds (the mock's 5 synthetic ads) when devUiEnabled; Quick button cycles them, Studio chips. Tests: unit dev-samples, e2e quick/studio.
<!-- SECTION:NOTES:END -->
