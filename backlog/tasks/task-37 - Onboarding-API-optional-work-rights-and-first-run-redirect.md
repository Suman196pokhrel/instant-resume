---
id: TASK-37
title: Onboarding API, optional work rights and first-run redirect
status: In Progress
assignee: []
created_date: '2026-11-17T10:57:00Z'
updated_date: '2026-11-17T10:58:00Z'
labels:
  - m3
dependencies: []
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a new user, my wizard progress is saved on the server and my reviewed background lands in the knowledge base, even without work rights or paid roles. Split from TASK-7. Refs: SPEC §7.2 onboarding routes, §14.1, §1.4, §18.3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET/PUT /api/onboarding store wizard progress and a loose draft, filling entry and highlight IDs
- [ ] #2 POST /api/onboarding/complete saves the draft in merge or replace mode, keeping existing contact/work rights in merge, never duplicating IDs, and leaving projects untouched
- [ ] #3 A KB without work rights is valid, and an empty database sends / to /onboarding
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- Work rights becomes optional at the KB level (SPEC §14.1 makes the step skippable, §1.4 never infers it): kbObjectSchema workRights optional; superRefine guards it; writeKb skips the row when absent (readKb already leaves it absent). The Typst template already handles a missing workRights. KbScreen SingleCard falls back to { id: "kb-rights" } and shows "Not set", and its Edit PUTs.
- Onboarding state lives in the settings table under key "onboarding". The draft schema is loose: contact and workRights are .partial(); lists use the per-section entry schemas (complete entries; the form validates them first). This replaces onboardingStateSchema's shallow kbObjectSchema.partial() (TASK-7 comment #1).
- GET /api/onboarding returns the state, or defaults { step 0, maxStep 0, draft {}, completed false, saveMode "merge" }. PUT validates, clamps step and maxStep to 0..10, fills missing entry and highlight IDs, and stores and returns the normalised state.
- POST /api/onboarding/complete { mode }: reads the draft from the DB, not the body. Replace: the draft becomes the KB. Merge (or no KB yet): keep the existing contact and workRights, take the draft's where they're absent, append list entries whose IDs aren't already in the KB. Writes through writeKb (whole-KB validation, 422). Projects are untouched. Returns { added }, then marks completed and clears the draft. shortcut: the KB write and the state write are two steps, not one transaction.
- `/`: readKb null → /onboarding, else /dashboard.

Files: lib/schemas/kb.ts, lib/schemas/settings.ts, lib/db/kb.ts, lib/db/onboarding.ts (read/write state, complete), app/api/onboarding/route.ts, app/api/onboarding/complete/route.ts, app/page.tsx, components/kb/KbScreen.tsx, SPEC §6.1 (workRights?), §14.1 field list matched to §6.1/§13.2

Tests
- unit schemas: a KB without workRights parses; one with an invalid status still fails
- api tests/api/onboarding.test.ts: GET defaults; PUT fills IDs, clamps the step, 422 on an invalid body; complete 422 without a valid contact; a volunteer-only draft with no work rights saves into an empty KB, with added counted; merge keeps the existing contact and workRights and skips existing IDs; replace swaps the lists; projects survive both; after complete, state is completed with an empty draft
- api tests/api/root-page.test.ts: empty DB → /onboarding; with a KB → /dashboard
- e2e (kb.spec): workRights not set shows "Not set", and saving it creates it (via API on a KB without workRights; covered in api test, UI fallback rendered in TASK-7 e2e)

Out of scope: the wizard UI (TASK-7), `imported` and replace-draft confirmation (TASK-8)
<!-- SECTION:PLAN:END -->
