---
id: TASK-29
title: Setup checklist, responsive layout and accessibility pass
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-19T04:27:00Z'
labels:
  - m10
dependencies:
  - TASK-32
  - TASK-33
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As any user, the app guides my first run and works by keyboard, at phone width and with reduced motion. Refs: SPEC §12, §16, §18.4 #13, §20 local app acceptance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A fresh install shows the setup checklist at '0 of 3 done'; each step ticks as completed, and it can be dismissed
- [x] #2 Main flows have no console errors and no horizontal scroll at phone width
- [x] #3 Reduced motion disables transitions, and an automated axe check of main screens passes
- [x] #4 The full e2e suite (§18.4) passes from a fresh clone
- [x] #5 A side-by-side review of every screen against the mock (motion, tooltips, toasts, empty and error states) finds no inconsistencies
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach:
1. Setup checklist (SPEC §13.1, mock setupChecklistHtml): components/dashboard/SetupChecklist.tsx (client) above the page head. Steps: connection exists (useLlmChoice, browser), KB saved (server: readKb non-null), an application exists (server). Hidden at 3 of 3 or when prefs.dismissedOnboardingBanner; × PUTs the prefs with it set. Renders only once the browser connections are known (no count flicker). Mock styles: surface card, accent-line border, numbered circles (accent + check when done), first unfinished action primary, others ghost; 'or enter it manually' → /onboarding.
2. Phone width + console: an e2e sweep at 390px over the main screens (dashboard, KB, settings, new, quick, studio, workspace, import) asserting no horizontal scroll and no console errors; fix what it finds.
3. Reduced motion + axe: add @axe-core/playwright (dev). e2e: axe (wcag2a/aa) on the main screens with no violations; with reducedMotion 'reduce' a transition computes to ~0 s. Fix violations.
4. Fresh clone: clone to a temp folder, pnpm install, playwright install check, pnpm test:e2e.
5. Side-by-side review: screenshot each main screen against the mock; fix small inconsistencies, log big ones in bugs_after_manual_review.txt.

Files: components/dashboard/SetupChecklist.tsx, app/(shell)/dashboard/page.tsx, tests/e2e/setup.spec.ts, tests/e2e/a11y.spec.ts, package.json, plus fixes found.

Tests:
- e2e (empty server): 0 of 3 → key → 1 → onboarding saved → 2 → dismiss hides (and stays hidden after reload) → un-dismiss → first application → gone at 3 of 3 (AC1)
- e2e: phone-width sweep, no horizontal scroll, no console errors (AC2)
- e2e: axe on main screens; reduced motion zeroes transitions (AC3)
- fresh-clone run of the full suite (AC4)
- review notes on the card (AC5)

Out of scope: new features found during review (Parked).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Setup checklist; a11y sweep (axe on 8 screens, 390px, console, reduced motion). Fixes: --muted #5F6964 for AA, underlined text links, role=img on reflected marks, focusable preview, phone render status; New/Quick/Studio breadcrumbs + centred layouts per mock. Fresh clone: 138 e2e pass. Quick 'five stages' flake fixed (cards recorded as they appear). Review: dashboard, KB, settings, new, quick, studio, import, workspace, unlock, letter/resume preview match; parked dev-only sample JDs.
<!-- SECTION:NOTES:END -->
