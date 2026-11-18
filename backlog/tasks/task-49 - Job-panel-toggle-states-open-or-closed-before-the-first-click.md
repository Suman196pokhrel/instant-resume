---
id: TASK-49
title: Job panel toggle states open or closed before the first click
status: Parked
assignee: []
created_date: '2026-11-18T12:07:00Z'
labels: []
dependencies: []
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The preview-bar toggle has aria-expanded only once clicked: the default (open from 1180px, CSS) isn't announced. Read matchMedia with useSyncExternalStore so aria-expanded is always set on the client. Found in TASK-45 review.
<!-- SECTION:DESCRIPTION:END -->
