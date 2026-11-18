---
id: TASK-13
title: Generate documents with patch validation
status: Review
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T08:41:00Z'
labels:
  - m5
dependencies:
  - TASK-32
  - TASK-33
  - TASK-35
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I get a tailored resume and cover letter built only from my chosen entries, with every bullet traced to a highlight. This card is the core (skeleton, generate call, patch validator); the Studio screen and project save are TASK-43. Refs: SPEC §8.3, §18.1 Skeleton builder and Patch validator, US4.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The skeleton uses only the selected entries, in section order, omitting empty sections
- [x] #2 Every generated bullet carries a valid source highlight ID; unknown or cross-entry sources are rejected
- [x] #3 The patch validator rejects paths outside the target section and changes to id, kind, hidden, theme or order, and mutates nothing on rejection
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- Pure, browser-safe core; no UI (TASK-43 builds step 4 and the save). One generate call returns both documents (decided: fewer calls, KB sent once). Studio does no LLM match: the 'Matching' stage stays on device; the match call moves to Quick generate (TASK-24).
- buildSkeleton(kb, brief, selected, theme) -> { resume, coverLetter } (id/projectId 'draft'; TASK-43 drops them on POST).
- generateDocuments({kb, brief, selected, notes, tone, spelling}, adapter, signal): prompt with delimited <skeleton> (JSON + paths), <brief>, <entries> (selected, with highlight IDs), <notes>; validate both op lists; retry once if the patch is rejected, then throw outputError. maxOutputTokens set explicitly; jsonInPrompt decided once the op schema exists.
- validatePatch(doc, ops, { rules, kb }) applies to a deep copy with a small hand-written applier (only replace/add/move/remove on known paths) instead of fast-json-patch; never mutates input. Model sends bullets as {text, source}; the app assigns bullet IDs.

Decisions (SPEC edits in the build commit)
- §8.3: Studio matching on device, match call is Quick generate only; one generate call; no fast-json-patch; bullet value {text, source}; a bullet's source must be a highlight of the item's own ref entry (stricter than 'a selected entry').
- §14.4 step 4 stage list: 'Drafting the resume and cover letter' (one stage), failure 'Generation stopped while drafting.' (mock in TASK-43).

Rules
- Skeleton: Summary (always, text ''), Experience (selected roles, meta 'Location | Start to End', bullets []), Skills (all skill groups: not selectable in step 3), Portfolio, Education, Certifications and awards, Volunteer work (experience kind), one additional section per selected non-reference entry, Referees last; empty sections omitted. Cover letter: 4 paragraphs Opening, Evidence, Fit, Close (text ''), recipient {Hiring team, company, location}.
- Whitelists: GENERATION = replace /sections/i/text (summary|paragraph only), add /sections/i/items/k/bullets/- (items whose skeleton has bullets), replace /sections/i/items/k/line (skills only, same skills in any order; split on commas outside parentheses). rewrite(i) = text, line, items/k/bullets/j/text, move within one item's bullets, add/remove bullet, all under /sections/i/ only (TASK-16 uses it).
- After applying: Document schema parses; ids, kinds, hidden, section order, theme, recipient unchanged; every bullet source is a highlight of its item's ref entry.

Files
- new lib/generate/skeleton.ts, lib/generate/generate.ts (prompt, op schema), lib/patch/validate.ts
- lib/utils.ts gets newId (lib/db/kb.ts re-exports; db code stays out of the browser bundle)
- lib/llm/mock.ts: 'generate' fixture parses <skeleton>/<entries> from the prompt and returns ops that fit any KB (shared e2e KB changes); one bad-op path for the retry test
- docs/SPEC.md §8.3, §14.4, §18.1

Tests (tests/unit)
- skeleton: only selected entries; section order with referees last; empty sections omitted, summary kept; meta format; skills keep 'AWS (Lambda, ECS, SQS)'; volunteer and additional sections; reference-only additional never included; letter has 4 paragraphs + recipient (AC1)
- validator: accepts the allowed ops; rejects unknown and cross-entry sources (AC2); rejects paths outside rewrite(i), text on an items section, bullets on a skills item, a line with a changed skill set; rejects edits to id/kind/hidden/theme/order/recipient; rejects a schema-invalid result; input deep-equal after rejection (AC3); assigned bullet IDs unique
- generate: mock fixture output passes on the seed KB; a rejected patch retries once then throws an output LlmError; abort stays an abort

Out of scope
- Step 4 screen, project save, draft clearing, rendering, live Anthropic proof (TASK-43); rewrite call (TASK-16); checks stage and findings toast (TASK-20); prompt caching (TASK-41, parked).
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T08:41:00Z

---

Build done: lib/generate/skeleton.ts, lib/patch/validate.ts, lib/generate/generate.ts, mock 'generate' fixture, SPEC §3/§8.3. 221 unit + 73 e2e pass. DoD UI items: n/a, this card adds no UI (the screen is TASK-43).

---
<!-- COMMENTS:END -->
