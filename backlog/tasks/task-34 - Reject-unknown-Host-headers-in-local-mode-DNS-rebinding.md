---
id: TASK-34
title: Reject unknown Host headers in local mode (DNS rebinding)
status: Parked
assignee: []
created_date: '2026-11-17T09:47:00Z'
labels: []
dependencies: []
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Local-only mode trusts any Host; a DNS-rebinding page could read the KB via GET. Consider allowing only loopback hosts when APP_PASSWORD is unset. Raised while specifying TASK-2.
<!-- SECTION:DESCRIPTION:END -->
