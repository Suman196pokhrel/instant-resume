---
id: TASK-40
title: Sharper LLM error copy for 403 and plain 400
status: Done
assignee: []
created_date: '2026-11-18T07:28:00Z'
updated_date: '2026-11-20T02:33:00Z'
labels: []
dependencies: []
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-10 review: every 403 is reported as a bad key, though it can also mean the organisation can't use that model or the region is blocked; a plain 400 (such as a prompt that's too long) says 'Try again in a moment', which won't help. Refine once real cases show up in the brief/generate calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A 403 that isn't a bad key (model, organisation or region permission) says the key works but can't do this, and offers Choose a model; a region block says so
- [x] #2 A 400 for a request that's too long says so and suggests a model with more room or a shorter job description; any other plain 400 says the provider couldn't accept the request, not 'try again in a moment'
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
lib/llm/errors.ts: kinds 'access' and 'request'. 401 / API_KEY_INVALID / 403 whose message mentions an API key → key. Other 403 → access ('{Provider} won't let this key do that' / 'Your key works, but its account can't use {model} for this, because of a permission, organisation or region limit. Choose another model, or check the key's access with {Provider}.', Choose a model); region text or unsupported_country_region_territory → access with title '{Provider} isn't available in your region' / 'Switch to another provider in Settings.' 400 too long (prompt is too long, context_length_exceeded, maximum context, exceeds the maximum number of tokens) → request 'This is too long for {model}' / 'Your knowledge base and the job description together are more than this model accepts. Choose a model with more room, or shorten the job description.' Other 400 → request '{Provider} couldn't accept this request' / 'Nothing was changed. Try another model; if it keeps happening, it's a problem in Instant Resume.' SPEC §8.3 table. Unit tests in llm-errors.test.ts with real body shapes; the gemini 403 PERMISSION_DENIED row moves from key to access (it was the assumption this card questions).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
lib/llm/errors.ts: new kinds access (non-key 403, region block) and request (too long, other 400) with Choose a model. SPEC §8.3 table. Unit tests with real provider body shapes.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T07:58:00Z

---

Also: Anthropic's 400 'The compiled grammar is too large…' maps to 'Something went wrong… try again', which can't help; it's a schema problem (use jsonInPrompt).

---
<!-- COMMENTS:END -->
