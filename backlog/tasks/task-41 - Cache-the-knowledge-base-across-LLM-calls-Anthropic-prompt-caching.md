---
id: TASK-41
title: Cache the knowledge base across LLM calls (Anthropic prompt caching)
status: Done
assignee: []
created_date: '2026-11-18T07:35:00Z'
updated_date: '2026-11-20T02:42:00Z'
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
- [x] #1 Repeated calls in one generation reuse a cached KB prefix on Anthropic
- [x] #2 Usage before and after is recorded on the card
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC1 as built: match and generate have different system prompts so they can't share a prefix; instead match caches the KB (first in its prompt) across jobs, generate caches its whole prompt (retry, Regenerate), rewrite caches brief+entries. Usage (Sonnet 5.5, real KB, 2026-11-20): before every call paid full input: match 10,681, generate 14,193. After: next job's match read 10,426 from cache (write 10,426 first time), Regenerate read 14,189. GenerateArgs.cachePrefix + promptParts in lib/llm/adapter.ts; usage reports cacheRead/WriteTokens.
<!-- SECTION:NOTES:END -->
