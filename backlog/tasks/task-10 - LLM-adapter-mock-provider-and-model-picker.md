---
id: TASK-10
title: LLM adapter, mock provider and model picker
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m4
dependencies: []
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can pick which connected model to use from anywhere, and the app talks to it through one adapter that tests can replace. Refs: SPEC §8.1, §8.3, §17 (?mock= scenarios), §18.2 Model picker. Verify the current AI SDK structured-output API before building.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The model picker lists only connected providers' models, and switching updates the label everywhere in one click
- [ ] #2 All LLM calls go through one adapter with a deterministic mock provider used by every automated test
- [ ] #3 Provider responses are validated against Zod schemas; invalid output becomes a readable error, never a crash
- [ ] #4 A documented, opt-in check confirms browser-direct requests (CORS) work for all 3 providers
<!-- AC:END -->
