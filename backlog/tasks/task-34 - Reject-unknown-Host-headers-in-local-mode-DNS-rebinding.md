---
id: TASK-34
title: Reject unknown Host headers in local mode (DNS rebinding)
status: Done
assignee: []
created_date: '2026-11-17T09:47:00Z'
updated_date: '2026-11-20T02:25:00Z'
labels: []
dependencies: []
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Local-only mode trusts any Host; a DNS-rebinding page could read the KB via GET. Consider allowing only loopback hosts when APP_PASSWORD is unset. Raised while specifying TASK-2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Local only: a request whose Host isn't loopback (localhost, 127.x.x.x, [::1], any port) gets 403 before any page or API runs
- [x] #2 Loopback hosts work as before; password mode is unchanged (it may be served on any host)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
proxy.ts gate: when APP_PASSWORD is unset, take the Host header's hostname (strip port; [::1] form) and check isLoopback (lib/access/startup.ts). Not x-forwarded-host: there's no proxy in local mode and the browser sets Host. Else 403 text 'This address isn't allowed. Instant Resume only answers on this computer (127.0.0.1 or localhost).' Tests: tests/api/access.test.ts local-only block uses a loopback host; new cases: attacker.example → 403 for page and /api GET; localhost:3000, 127.0.0.1, [::1]:3000 pass; password mode still serves app.test. SPEC §4.1 adds the rule.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Local mode answers only loopback Host names (proxy.ts, isLoopback); other names get 403 before any page or API. Password mode unchanged. Tests: tests/api/access.test.ts.
<!-- SECTION:NOTES:END -->
