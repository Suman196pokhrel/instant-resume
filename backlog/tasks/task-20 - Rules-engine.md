---
id: TASK-20
title: Rules engine
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T11:50:00Z'
labels:
  - m7
dependencies:
  - TASK-32
  - TASK-33
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I'm warned about missing keywords, banned phrases and claims my knowledge base doesn't support. Refs: SPEC §10, §18.1 Rules engine and Parse safety.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Keyword coverage handles exact, hyphen/space and plural matches, sets the inKb flag and ignores hidden sections
- [x] #2 Banned phrases match on word boundaries with one finding per section
- [x] #3 Grounding flags '40%' against a 25% source, passes '4.2s to 1.1s', flags unknown tech terms and skills, and ignores years
- [x] #4 Parse safety fails a non-standard heading with its hint
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- One pure function runChecks(doc, brief, kb, notes?) in lib/checks/run.ts, ported from mock docs.js runChecks. No LLM, no UI (the Checks panel, the 250 ms debounce and preview flags are TASK-21).
- Reuse what exists: kwMatch, matchedKeywords, kbText and entryText (lib/match/keywords), sectionText (lib/doc/plain-text), splitSkills (lib/patch/validate) and BANNED_PHRASES (lib/rules).
- Visible sections only, everywhere. Findings keep the mock's order: banned phrases, then grounding, section by section.
- Numbers are compared as tokens, not substrings: the source's number tokens form a set (spaces removed, trailing "." and "," stripped), so "4" no longer passes against "40%". Four-digit years (19xx, 20xx) are ignored everywhere.

Files
- new lib/checks/run.ts: runChecks, plus STANDARD_HEADINGS and EXTRA_TERMS (Kubernetes, Java, Rust, Kafka, Angular, Vue)
- new tests/unit/checks.test.ts (using tests/fixtures/kb.json)
- docs/SPEC.md §10: add the optional bulletId; inKb also counts the application's notes (as the mock does); state the banned-phrase word policy

Data
- Output as SPEC §10, plus an optional findings[].bulletId so the preview can flag bullets (TASK-21 #4). Nothing is stored and no API changes.

Tests (tests/unit/checks.test.ts)
- AC1 coverage:
  - "Event-driven" matches "event driven"; "Design systems" matches "design system"; an exact match.
  - A keyword found only in a hidden section is missing.
  - inKb is true when the KB backs it, false when not, true when only the notes contain it.
- AC2 banned:
  - "results driven" in a bullet gives one finding with the SPEC title and detail.
  - The same phrase twice in one section gives one finding; in two sections, two.
  - "dynamically" is not flagged. Policy: whole words only, so "leveraged" is not flagged either.
  - A hidden section is not flagged.
- AC3 grounding:
  - A bullet saying "40%" with a 25% source is flagged ("40%" doesn't match…, Under {employer}).
  - "4.2s to 1.1s" passes against a source with both.
  - "Kafka" in a bullet whose role doesn't record it is flagged; a term recorded elsewhere in the same role passes.
  - A missing or unknown source gives "Bullet has no source in your knowledge base".
  - A skill not in the KB is flagged; "AWS (Lambda, SQS)" is one skill and is not split.
  - Summary numbers are checked against the KB and notes; "since 2019" and "eight years" are ignored; a number only in the notes passes.
  - A bullet ending "300." is matched as "300".
- AC4 parse:
  - The resume heading "My Journey" fails "Standard section headings" with its hint.
  - The other four checks are ok; a cover letter always passes the headings check.
  - A hidden non-standard section doesn't fail it.

Out of scope
- The Checks panel, ring, verdict, jump-to-section and Emphasise/Add it actions (TASK-21)
- The Quick generate coverage finding below 60% (TASK-26)
- Inflected banned forms (leveraged, utilised): park it if wanted
- The DoD UI and keyboard items: this card has no UI
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
runChecks(doc, brief, kb, notes?) in lib/checks/run.ts: keywords (inKb incl. notes), banned phrases (whole words), grounding (numbers as tokens, years ignored; tech terms; skills; summaries), parse safety. 15 unit tests; SPEC §10 and mock docs.js updated.
Review: all ACs pass (295 unit, 98 e2e), mock runChecks exercised headlessly. Parked: banned phrases in employer names.
<!-- SECTION:NOTES:END -->
