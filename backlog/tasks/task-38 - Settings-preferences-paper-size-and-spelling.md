---
id: TASK-38
title: 'Settings: preferences (paper size and spelling)'
status: To Do
assignee: []
created_date: '2026-11-17T11:30:00Z'
labels:
  - m4
dependencies: []
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can choose A4 or Letter and Australian or US conventions, saved at once. Refs: SPEC §13.3 Preferences, §6.5. Found while building TASK-9: no card owned this Settings section.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Paper size (A4/Letter) and Spelling and conventions (Australian/US) use the Segmented control and save immediately via PUT /api/settings with the toast "Preference saved"
- [ ] #2 The choices survive a reload and default to A4 and Australian
<!-- AC:END -->
