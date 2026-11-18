---
id: TASK-40
title: Sharper LLM error copy for 403 and plain 400
status: Parked
assignee: []
created_date: '2026-11-18T07:28:00Z'
labels: []
dependencies: []
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-10 review: every 403 is reported as a bad key, though it can also mean the organisation can't use that model or the region is blocked; a plain 400 (such as a prompt that's too long) says 'Try again in a moment', which won't help. Refine once real cases show up in the brief/generate calls.
<!-- SECTION:DESCRIPTION:END -->
