---
id: TASK-50
title: 'Match call: evidence and gaps for Quick generate'
status: Done
assignee: []
created_date: '2026-11-18T12:30:00Z'
updated_date: '2026-11-18T12:32:00Z'
labels: []
dependencies: []
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker using Quick generate, the app picks the entries that back each must-have and tells me which have no evidence. Refs: SPEC §8.3 call 2, §14.3 stage 2. Split from TASK-24.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 matchEvidence returns requirements with evidence, the selected entries and the gaps; unknown IDs are dropped before anything uses them
- [x] #2 A must-have with no valid evidence (or left out by the model) is a gap; notes can't close one
- [x] #3 The mock adapter answers the match call, and its gaps scenario yields gaps that clear once the KB has evidence
- [x] #4 An opt-in live check proves it on Anthropic
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- New lib/match/evidence.ts exports matchSchema and matchEvidence(brief, kb, adapter, signal) for SPEC §8.3 call 2:
  - The prompt holds a <brief> block (must-haves) and a <knowledge-base> block: entries with their IDs, highlight IDs and text, plus skills.
  - Strict structured output {requirements: {requirement, evidence[]}[], suggestedEntryIds[]}.
- Validation:
  - Evidence keeps only known entry or highlight IDs.
  - Each brief requirement takes the model's evidence for it (matched case-insensitively); a requirement left out has none.
  - gaps = must-haves with no evidence. Notes are never sent, so they can't close a gap.
- selected = suggestSelection(kb, keywords), the Studio baseline (all roles, education, referees…), plus the valid suggestedEntryIds, plus the entries that own any evidence highlight.
- Mock fixture "match":
  - Evidence comes from highlights whose text or skills match a brief keyword the requirement mentions; otherwise the first highlight, so the happy path has no gaps.
  - The brief fixture's "gaps" scenario appends the mock's SCENARIO_GAPS requirements and keywords (Payments, Kubernetes). Those find evidence only when the KB has the keyword, so they clear after Add evidence.

Files
- new lib/match/evidence.ts
- lib/llm/mock.ts: the match fixture and the gaps brief
- new tests/unit/match.test.ts
- new tests/unit/match-live.test.ts (IR_LIVE=1)
- SPEC §8.3: note the selection rule

Tests
- Unit, with the mock adapter and the seed KB:
  - unknown IDs are dropped
  - an omitted requirement is a gap
  - selected includes the baseline, the suggestions and the evidence owners
  - the mock's gaps scenario gives 2 gaps on the seed KB, and 1 once a Kubernetes highlight exists
- Live (opt-in): Mintleaf on Anthropic returns valid IDs and plausible gaps, with time and tokens logged

Out of scope
- The pipeline and UI (TASK-24)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
matchEvidence (lib/match/evidence.ts): validated evidence IDs, gaps, selection = baseline + suggestions + evidence owners; mock match fixture and gaps scenario (Payments, Kubernetes).
Review: 3 unit tests; live on Sonnet 5.5 3.2 s, ~2,840 in / 400 out, all IDs valid, no gaps on Mintleaf.
<!-- SECTION:NOTES:END -->
