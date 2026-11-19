---
id: TASK-38
title: 'Settings: preferences (paper size and spelling)'
status: Done
assignee: []
created_date: '2026-11-17T11:30:00Z'
updated_date: '2026-11-19T03:37:00Z'
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
- [x] #1 Paper size (A4/Letter) and Spelling and conventions (Australian/US) use the Segmented control and save immediately via PUT /api/settings with the toast "Preference saved"
- [x] #2 The choices survive a reload and default to A4 and Australian
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach: add a 'Preferences' section to PrefsSettings (components/settings/Prefs.tsx, TASK-51) after Quick generate defaults, per mock views-app.js: Paper size Segmented (A4, Letter; 'Used for preview and export') and Spelling and conventions Segmented (Australian=en-AU, US=en-US; 'Australian adds work rights and referees to resumes'). Same save(): full-prefs PUT, toast 'Preference saved', rollback on failure. No API change (PUT /api/settings and readPrefs exist).

Files: components/settings/Prefs.tsx, tests/api/settings.test.ts (new), tests/e2e/settings.spec.ts.

Tests:
- api: GET with no row → A4 + en-AU (AC2 defaults)
- api: PUT Letter + en-US, then GET returns them (AC2 survives reload; the page reads the same readPrefs)
- api: PUT paper 'A3' → 422, nothing stored
- e2e (PUT stubbed, shared DB): Letter and US radios send the full prefs and toast 'Preference saved' (AC1)

Out of scope: Your data (TASK-27), Access (TASK-28).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Preferences section in PrefsSettings (shared state with Quick generate defaults). Round trip covered by tests/api/settings.test.ts; e2e stubs the PUT because the e2e DB is shared.
<!-- SECTION:NOTES:END -->
