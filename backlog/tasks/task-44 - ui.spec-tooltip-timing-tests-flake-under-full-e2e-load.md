---
id: TASK-44
title: ui.spec tooltip timing tests flake under full e2e load
status: Parked
assignee: []
created_date: '2026-11-18T09:08:00Z'
labels: []
dependencies: []
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seen 2026-11-18 (TASK-43): tooltips (AC2) 'show after 150ms…' and 'keyboard focus shows the tooltip' failed in 1 of 4 full runs (another run failed one toBeVisible); they pass 30/30 alone. Studio generate tests now render Typst in parallel. Consider looser timing or running ui.spec serially.
<!-- SECTION:DESCRIPTION:END -->
