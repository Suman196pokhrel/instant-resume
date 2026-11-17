---
id: TASK-7
title: Manual onboarding wizard
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T11:09:00Z'
labels:
  - m3
dependencies:
  - TASK-37
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a new user, I can enter my background step by step and come back where I left off. Refs: SPEC §14.1 (US1), §18.2 Onboarding, §18.4 #1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An empty database redirects / to /onboarding, which offers manual entry or resume import
- [x] #2 The wizard covers the §14.1 steps with a progress bar showing the current step and steps left
- [x] #3 Required fields show errors; only optional steps offer Skip this step
- [x] #4 Each step saves on completion, and reloading resumes at the same step
- [x] #5 A volunteer-only background reaches Review and saves to the KB
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach (UI on the TASK-37 API; mock views-onboarding.js)
- /onboarding (shell): the chooser (import card primary with "Recommended · about 2 minutes", manual secondary), without the mock-only "This mock makes no provider calls" line. When saved, unfinished progress exists (not completed and step or draft set), it redirects to /onboarding/manual.
- /onboarding/manual (focus, full screen): a server page reads the state and, only when devUiEnabled(), the sample sections, then renders a client Wizard. Top bar: brand, progressbar "Step n of 11" / "k steps left" / "Last step", "Save and exit" (→ /dashboard). Left rail: numbered steps with checks and "optional"; steps up to maxStep are clickable. Card: h1, blurb, Fill with sample (dev only), body, footer (Back, "✓ Saved", Skip this step on optional steps, Save and continue / Save to knowledge base).
- Contact and Work rights: field grid. Repeatable steps: compact entry cards (Edit, Remove), then a dashed inline form "Add your first {noun}" / "Add another {noun}" / "Edit {noun}" with "Save {noun}" / "Update {noun}". Continue saves a partly filled form when it's valid. EntryForm (fields grid and highlights editor) is extracted from EntryDialog and shared, so the ID, skills and evidenceFor preservation lives in one place.
- Every save awaits PUT /api/onboarding and adopts the returned state (stable IDs). Continue shows a spinner, moves on with a view-transition slide (existing step-out/in classes) and flashes "✓ Saved" (2.4 s fade keyframe in globals.css). Loading at step > 0 shows the toast "Picked up where you left off: {step}".
- Review: a row per step with a summary, a pill ("{n} added", "Done", "Empty") and Edit; the save mode select only when a KB exists; "Save to knowledge base" → POST complete, then the done screen (animated check, "Your knowledge base is ready", "{n} entries saved…", Review knowledge base / Start an application). An invalid contact shows the mock toast and goes to step 1.

Files: app/(shell)/onboarding/page.tsx, app/(focus)/onboarding/manual/page.tsx, components/onboarding/Wizard.tsx (+ Review, Done if large), components/kb/EntryForm.tsx (from EntryDialog), app/globals.css (saved fade, done check), tests/e2e/onboarding.spec.ts, tests/e2e/shell.spec.ts

Tests (e2e on its own empty server: spawn `pnpm start` on port 3103 with a fresh IR_DB_URL and IR_DEV_UI=1, killed in afterAll; serial)
- AC1: / → /onboarding shows both choices; "Enter details manually" opens the wizard at Contact details
- AC2: the progress label reads "Step 1 of 11" / "10 steps left", and Review reads "Last step"; the rail lists the 11 steps
- AC3: Continue on empty Contact shows "Enter your full name" and focuses Full name; Skip shows on Work rights but not on Contact or Review
- AC4: after Contact, reload resumes at Work rights with the toast; /onboarding redirects to the wizard while it's unfinished
- AC5: volunteer-only (contact, skip, skip, add a volunteer role, skip the rest) reaches Review with "1 added", saves, shows "Your knowledge base is ready", and /kb/volunteering lists the role while /kb/workRights shows "Not set"
- DoD: keyboard path through Continue; the existing shell.spec placeholder checks are updated

Out of scope: import (TASK-8); the setup checklist (TASK-29)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Chooser (/onboarding, resumes an unfinished wizard), full-screen 11-step wizard with progress, rail, per-step PUT /api/onboarding (resumes after reload), inline entry forms shared with the KB dialog (EntryForm), Skip on optional steps, Review (merge/replace only when a KB exists) and the animated done screen. Built on TASK-37.
Review: 118 unit + 51 e2e green (onboarding e2e on its own empty-DB server, port 3103). Contact and Experience steps match the mock. Fixed in review: focus was lost to <body> on every step change (now the heading), '1 highlights' grammar (mock too). Also fixed a 1-in-1000 flaky session unit test. Not re-reviewed by a fresh session.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:00:00Z

---

From TASK-3 review: onboardingStateSchema.draft is kbSchema.partial(), which is shallow: a half-filled contact or role in a wizard draft fails validation. Loosen the draft shape when building the wizard.

---

created: 2026-11-17T10:03:00Z

---

From the TASK-4 split: GET/PUT /api/onboarding and POST /api/onboarding/complete (merge/replace) are built in this card.

---
<!-- COMMENTS:END -->
