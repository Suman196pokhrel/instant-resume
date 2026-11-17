---
id: TASK-7
title: Manual onboarding wizard
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T10:00:00Z'
labels:
  - m3
dependencies:
  - TASK-32
  - TASK-33
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:00:00Z

---

From TASK-3 review: onboardingStateSchema.draft is kbSchema.partial(), which is shallow: a half-filled contact or role in a wizard draft fails validation. Loosen the draft shape when building the wizard.

---
<!-- COMMENTS:END -->
