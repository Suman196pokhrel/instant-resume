---
id: TASK-39
title: Live-check OpenAI and Gemini from the browser
status: Parked
assignee: []
created_date: '2026-11-18T07:26:00Z'
labels: []
dependencies: []
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As the owner, once Anthropic is proven end to end, I run the opt-in real-provider check (tests/e2e/cors.spec.ts) with OpenAI and Gemini keys in .env.keys, so all three providers are confirmed from the browser and their model IDs are current. Split from TASK-10 AC4 (Anthropic is the primary provider; checked live 2026-11-18).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 cors.spec.ts passes for OpenAI with a real key
- [ ] #2 cors.spec.ts passes for Gemini with a real key
- [ ] #3 Any model ID a provider no longer lists is updated in lib/llm/providers.ts and mock/js/data.js
<!-- AC:END -->
