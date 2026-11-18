---
id: TASK-12
title: 'Studio setup: job brief and entry selection'
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T08:20:00Z'
labels:
  - m5
dependencies:
  - TASK-32
  - TASK-33
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can paste a job description, review the extracted brief, and choose which entries to use before generating. Refs: SPEC §14.4, §6.2, §8.3. Mock: views-new.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New application offers Quick generate (primary) and Studio; Generate is disabled until there is text
- [x] #2 The brief shows requirements, nice-to-haves and keywords, each keyword marked backed or not backed by the KB, and keywords can be removed
- [x] #3 Suggested entries are preselected, with a live 'Covers n of m keywords' count
- [x] #4 A failed extraction shows the reason, and Retry works without pasting again
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- /new: the chooser exactly as mock newProjectChooser (two link cards, Quick generate primary with Recommended pill; note below).
- /new/studio: one client component (components/studio/StudioSetup.tsx) with the mock stepper (Job description, Job brief, Choose entries, Generate). Step 4 is TASK-13: here the footer button "✦ Generate resume and cover letter" validates the selection and is otherwise disabled with the note "Generation arrives with the next update" (replaced in TASK-13).
- Draft: { stage, jdText, notes, brief, selected } in localStorage (instant-resume-studio-draft, Zod-checked on read, per-device like the active model; not secret). It persists across navigation and reloads; TASK-13 saves notes, brief and selection with the project (projectSchema already has notes, brief, selected), which completes AC4.
- One LLM call in Studio setup: lib/brief/extract.ts extractBrief(jd, adapter, signal) -> name "brief", briefSchema (small, strict mode), system prompt per SPEC §8.3/§6.2; keywords not found in the JD text are dropped after the call (grounding). Suggestions are computed on the device, not by the LLM match call: Studio pre-ticks per the mock (roles, volunteering, education, referees, non-reference additional sections, certifications, and portfolio items or other credentials with a keyword match). The match call stays with generation (TASK-13), where gaps need it. This keeps Studio setup to one call.
- lib/match/keywords.ts (ported from mock docs.js): kwMatch (case-insensitive, hyphen/space, trailing-s), matchedKeywords, kbText(kb) without reference-only text, entryText(entry), suggestSelection(kb, brief), coverage(kb, brief, selected) -> { covered, total } from ticked entries plus the skills list. Reused later by the rules engine (M7).
- Screens per SPEC §14.4 and mock studioSetupView: no-connection callout; textarea, character count, notes disclosure (open only with notes); "✦ Extract requirements" disabled without a connection or text; under 80 characters: "That looks too short to be a full job description. Paste the whole ad, including requirements."; extracting skeleton + "Reading the job description with {model}…"; brief with editable Role/Company/Location/Team, Requirements and Nice to have with counts, keyword chips (backed ✓ teal / not backed dashed) with remove buttons, legend, Add a keyword, work-rights callout; Choose entries with groups, Suggested marker, "Matches …" (up to 5) or "No keyword matches", relevance bar with tooltip, pills "Covers m of n keywords" (warn under half) and "n of total selected", "Select at least one knowledge base entry", sticky footer "Runs on {model}, about 6,000 tokens". Failure: LlmErrorCallout with Retry (JD kept). Mock fixture "brief": the SPEC §17 Mintleaf brief for the Mintleaf ad, else a brief built from the ad's first lines and its keywords found in a fixed tech list.

Files
- new: lib/match/keywords.ts, lib/brief/extract.ts, components/studio/StudioSetup.tsx, components/studio/NewChooser.tsx (or inline in page), tests/fixtures/jds/mintleaf.txt (from mock data.js), tests/unit/{keywords,brief}.test.ts, tests/e2e/studio.spec.ts
- edit: app/(shell)/new/page.tsx, app/(shell)/new/studio/page.tsx (reads the KB server-side and passes it in), lib/llm/mock.ts (brief fixture), docs/SPEC.md §8.3 (Studio suggestions on the device), §14.4

Tests
- AC1 e2e: chooser cards and links; Extract disabled with no connection (callout shown) and with empty text; short text error.
- AC2 e2e (mock, Mintleaf): brief shows 5 requirements, 3 nice-to-haves, 12 keyword chips, React backed ✓ and Payments-style unbacked dashed; removing a keyword updates the count; adding one works; edits survive a reload. Unit: kwMatch cases (case, hyphen, plural), kbText skips reference-only, extractBrief drops keywords not in the JD and uses name "brief".
- AC3 unit: suggestSelection and coverage on the seed KB + Mintleaf brief; e2e: suggested rows pre-ticked, unticking changes "Covers m of n keywords" and "n of total selected" live; none ticked -> "Select at least one knowledge base entry".
- AC4 e2e: notes typed on step 1 are in the saved draft after reload (TASK-13 saves them with the project).
- AC5 e2e: ?mock=brief-error (new scenario, fails the first brief call) shows the callout; Try again shows the brief without pasting again.
- Live: one brief call on the Mintleaf ad with the Anthropic key, timing and tokens on the card.

Out of scope
- Step 4 generation and the LLM match call (TASK-13); sample JD chips (dev only, skipped); Quick generate (M9).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Chooser + Studio steps 1-3. One LLM call (brief, strict mode; live Sonnet 5.5 2.5 s, ~1.16k in / 250 out); suggestions and coverage on the device (lib/match/keywords.ts, whole-word matching fixes the mock's AWS/Award bug). Draft in localStorage; notes-with-project moved to TASK-13. Generate step is TASK-13.
<!-- SECTION:NOTES:END -->
