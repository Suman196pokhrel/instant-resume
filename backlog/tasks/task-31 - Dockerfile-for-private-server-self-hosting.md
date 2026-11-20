---
id: TASK-31
title: Dockerfile for private-server self-hosting
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-20T02:52:00Z'
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
- [x] #1 The image refuses to start without APP_PASSWORD
- [x] #2 The SQLite data directory is a mounted volume, and the session secret is never baked into the image
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Dockerfile (node:24-slim, build + prune, runs as node, HOST 0.0.0.0) + .dockerignore. Verified 2026-11-20: no APP_PASSWORD → exit 1 with the startup message; with it, /unlock 200, /api/kb 401 then 200 after unlock; data/ holds instant-resume.db and session-secret in the volume and a session survives a new container; no .env*, data or tests in the image. Image 1.6 GB (full node_modules; standalone output would shrink it).
<!-- SECTION:NOTES:END -->
