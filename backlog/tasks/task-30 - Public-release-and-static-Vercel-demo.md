---
id: TASK-30
title: Public release and static Vercel demo
status: Parked
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m11
dependencies: []
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Publish setup and contribution docs, CI, and the static simulated demo from mock/. Needs explicit owner approval to publish or deploy. Refs: SPEC §1.5, §3.1, §18.5, §20 public demo and publication acceptance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CI runs typecheck, lint, test and test:e2e offline with the mock provider
- [ ] #2 The demo collects no real keys and makes no provider requests
- [ ] #3 The README documents setup, scripts, BYOK costs and the data flow
<!-- AC:END -->
