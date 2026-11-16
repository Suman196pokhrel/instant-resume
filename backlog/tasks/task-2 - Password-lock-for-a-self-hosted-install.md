---
id: TASK-2
title: Password lock for a self-hosted install
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m1
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As someone running Instant Resume on a private server, I can set APP_PASSWORD so nobody else can reach my knowledge base. Built before any route handler. Refs: SPEC §4.1, §18.1 Access, §18.3, §18.4 #16. Mock: Views.unlock.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With APP_PASSWORD unset, no page or /api route asks for a session
- [ ] #2 With it set, pages redirect to /unlock and /api routes return 401 {error: locked} without a valid session
- [ ] #3 A wrong password returns 401, the 6th attempt within a minute returns 429, and the right one sets the ir_session cookie and lands on the requested page
- [ ] #4 An expired or tampered cookie, or one signed before a password change, is rejected; POST /api/lock clears the cookie
- [ ] #5 A state-changing request with a foreign Origin returns 403
<!-- AC:END -->
