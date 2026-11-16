---
id: TASK-31
title: Dockerfile for private-server self-hosting
status: Parked
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - infra
dependencies: []
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optional container image for running on a private server. A container binds a non-loopback host, so it must require APP_PASSWORD and sit behind TLS (SPEC §4.1). Not in SPEC: update SPEC in the same commit if accepted.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The image refuses to start without APP_PASSWORD
- [ ] #2 The SQLite data directory is a mounted volume, and the session secret is never baked into the image
<!-- AC:END -->
