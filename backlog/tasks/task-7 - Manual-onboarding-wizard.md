---
id: TASK-7
title: Manual onboarding wizard
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m3
dependencies: []
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a new user, I can enter my background step by step and come back where I left off. Refs: SPEC §14.1 (US1), §18.2 Onboarding, §18.4 #1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An empty database redirects / to /onboarding, which offers manual entry or resume import
- [ ] #2 The wizard covers the §14.1 steps with a progress bar showing the current step and steps left
- [ ] #3 Required fields show errors; only optional steps offer Skip this step
- [ ] #4 Each step saves on completion, and reloading resumes at the same step
- [ ] #5 A volunteer-only background reaches Review and saves to the KB
<!-- AC:END -->
