---
id: TASK-41
title: Cache the knowledge base across LLM calls (Anthropic prompt caching)
status: Parked
assignee: []
created_date: '2026-11-18T07:35:00Z'
labels: []
dependencies: []
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-11 efficiency discussion: brief, match and generate each send the KB. Put the KB (and fixed system prompts) in a cached prefix (Anthropic cache_control via providerOptions) so repeated calls within minutes cost about a tenth of the input. Measure usage before and after on the Mintleaf sample.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Repeated calls in one generation reuse a cached KB prefix on Anthropic
- [ ] #2 Usage before and after is recorded on the card
<!-- AC:END -->
