---
id: TASK-28
title: Unlock screen and Settings → Access
status: In Progress
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-19T03:43:00Z'
labels:
  - m10
dependencies:
  - TASK-32
  - TASK-33
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a self-hoster, I unlock my install from a clear screen and can lock it again from Settings. Refs: SPEC §4.1, §13.3, §18.4 #16. Mock: Views.unlock and Settings → Access.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Empty and wrong passwords show their errors
- [ ] #2 The 5th failure shows a countdown with Unlock disabled
- [ ] #3 The right password lands on the originally requested page
- [ ] #4 Settings → Access shows 'Password lock is on', and Lock now returns to the unlock screen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach:
- app/unlock/page.tsx (server): next = safeNext(searchParams.next); renders a centred card (mock .unlock-card: surface, line border, r-lg, shadow-card, 28px padding, max 400px) with a 40px lock mark (BrandMark style, Lock icon), h1, sub, and components/access/UnlockForm.tsx (client).
- UnlockForm: Field 'Password' (type password, autocomplete current-password, Show/Hide aside like Connections), full-width primary Unlock (Loader2 spinner + 'Unlocking' while posting). Empty → 'Enter the password' (no request). 401 → "That password isn't right." and select the text. 429 or a 401 carrying retryAfter → 'Too many attempts. Try again in {n} seconds.' (singular for 1) ticking every second with Unlock disabled; clears at 0. Typing clears a non-countdown error. Success → toast 'Unlocked on this device', router.replace(next). Focus the field on mount. Nothing about the setup on the screen.
- Settings → Access (components/settings/Access.tsx, client): password mode → 'Password lock is on' + ok pill 'Protected' (Lock icon), the two texts, ghost sm 'Lock now' → POST /api/lock, toast 'Locked. Enter the password to continue.', router.replace('/unlock?next=/settings'). Local mode → 'Local only' + pill 'This computer only' (Shield icon) and its text. Settings page passes passwordMode = !!process.env.APP_PASSWORD.
- Sidebar footer reads 'Stored on your server' in password mode: (shell)/layout passes the flag to AppShell.
- e2e: runOnEmptyServer(port, { env, seed }) gains an env + seed option (db:seed before start); each test sets its own x-forwarded-for so the in-memory rate limit doesn't leak between tests.

Files: app/unlock/page.tsx, components/access/UnlockForm.tsx, components/settings/Access.tsx, app/(shell)/settings/page.tsx, app/(shell)/layout.tsx, components/shell/AppShell.tsx, tests/e2e/server.ts, tests/e2e/unlock.spec.ts (new), tests/e2e/settings.spec.ts.

Tests (e2e, password server seeded, SPEC §18.4 #16):
- /kb/roles shows the unlock screen; empty → 'Enter the password'; wrong → error and the text selected (AC1)
- 5 wrong → countdown text and Unlock disabled (AC2)
- right password lands on /kb/roles with the toast; footer reads 'Stored on your server' (AC3)
- Settings → Access shows 'Password lock is on'; Lock now → unlock screen + toast; /settings needs unlocking again (AC4)
- shared server: Settings → Access shows 'Local only' and no Lock now
- Show/Hide toggles the field type; Enter submits (DoD keyboard)

Out of scope: password change UI (server env only by design).
<!-- SECTION:PLAN:END -->
