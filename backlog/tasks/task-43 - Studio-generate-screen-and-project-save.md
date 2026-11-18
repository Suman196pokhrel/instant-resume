---
id: TASK-43
title: Studio generate screen and project save
status: Review
assignee: []
created_date: '2026-11-18T08:31:00Z'
updated_date: '2026-11-18T09:08:00Z'
labels:
  - m5
dependencies:
  - TASK-13
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I watch my resume and cover letter being generated, then land in the Workspace of a new project that keeps my notes, brief and selection. Refs: SPEC §14.4 step 4, US4. Mock: views-new.js generate(). Split from TASK-13 (the core it calls).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Generation creates a project (one generate call, ops validated) and opens /projects/[id]; the resume and cover letter compile with the Typst templates first (showing the preview is TASK-15)
- [x] #2 Notes, brief and selection from the Studio draft are saved with the project, and the draft is cleared only after the save succeeds
- [x] #3 Step 4 shows the stages, elapsed time and ghost page as in the mock; a failure shows the stage in red and a callout with Retry, Switch model and Back to entries, and nothing is saved
- [x] #4 Proven live on Anthropic: the generated documents pass the validator; tokens and time measured and noted in SPEC §8.3
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- StudioSetup: 'Generate resume and cover letter' (with >=1 entry and a connection) switches to a Generating view held in component state, not the persisted draft (a reload mid-run lands back on step 3). The stepper shows step 4.
- Run: generateDocuments (TASK-13) -> render both with lib/render/client (dynamic import, as RenderWarmup does) -> POST /api/projects {project: brief title/company/location, jdText, brief, selected, notes, source 'studio'; documents without id/projectId} -> clear STUDIO_DRAFT -> router.push /projects/{id} -> toast 'Generated in {s}s. Review the checks before you export.' (the 'No issues found.' variant waits for TASK-20).
- Stages (one call, decided in TASK-13): Matching knowledge base entries to the brief (on device; the skeleton build), Drafting the resume and cover letter, Validating the response (done note '{n} operations, all valid'), Running checks (on device; no-op until TASK-20), Rendering the PDF preview (on device). Icons per mock: ring, spinner while active (0.7 s linear), accent tick done, danger fill failed; per-stage seconds; '{s}s elapsed' ticking.
- Ghost page (right column, hidden under the mock's breakpoint): a heading + lines group grows (scaleX 0->1, 350 ms ease-out, tokens) every ~1.5 s while drafting, capped at the skeleton's section count; static under reduced motion.
- Failure: the active stage turns red; a block 'Generation stopped while {stage label, lower-case first letter}.' + 'Nothing was saved, and your job description, brief and selections are kept.' above LlmErrorCallout (title, message, Details; the provider's message is never shown, so SPEC's '{Provider} returned {code}: {message}' becomes the callout's Details line). Actions: Try again (reruns everything), Switch model (opens the top bar picker), Back to entries. A render or save failure shows as LlmError kind 'other'.
- Leaving the page aborts the call (as extract does).

Files
- components/studio/StudioSetup.tsx (Generating view, wire the button, drop 'Generation arrives with the next update.'), app/(shell)/new/studio/page.tsx (pass prefs: tone from quick.tone, spelling, paper)
- lib/db/settings.ts readPrefs(db), used by the page and /api/settings
- components/llm/LlmErrorCallout.tsx: optional children for extra actions
- components/shell/ModelPicker.tsx: a way to open it from Switch model (data-model-toggle on the trigger, clicked)
- app/globals.css: ghost line grow keyframe as a token if none fits
- docs/SPEC.md §14.4 step 4 (stage list, failure copy, Try again), §8.3 measured tokens/time; mock/js/views-new.js STAGES + failure copy, same commit
- tests/e2e/studio.spec.ts; opt-in live check tests/e2e/generate-live.spec.ts or a vitest file gated on ANTHROPIC_API_KEY (as cors.spec.ts)

Tests
- e2e (mock): Generate shows step 4 stages and lands on /projects/{id}; GET /api/projects/{id} has the notes, brief, selection, source 'studio', a resume whose bullets all carry sources and a 4-paragraph cover letter (AC1, AC2)
- e2e: after success the Studio draft is empty (back to step 1); a mock generate error (new scenario generate-error fails the first generate call, like brief-error; SPEC §8.1 list) shows the red stage, the callout and the three actions, nothing is saved (project count unchanged), Try again succeeds; Back to entries returns to step 3 with the selection kept (AC2, AC3)
- e2e: no entry ticked -> 'Select at least one knowledge base entry'; keyboard reaches every action; reduced motion leaves the ghost lines static (DoD)
- live (opt-in, Anthropic, seed KB + Mintleaf): generateDocuments passes validation; log tokens and seconds; decide jsonInPrompt (AC4)

Out of scope
- Workspace preview (TASK-15), checks and the findings toast (TASK-20), Quick generate (TASK-24), prompt caching (TASK-41)
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T08:40:00Z

---

From TASK-13: core is lib/generate/generate.ts generateDocuments(input, adapter, signal) -> { resume, coverLetter, count } (id/projectId 'draft': drop them on POST /api/projects). Decided one call: update SPEC §14.4 step 4 and mock views-new.js STAGES in the same commit: one stage 'Drafting the resume and cover letter', failure 'Generation stopped while drafting.' Validate stage done note uses count. jsonInPrompt not set yet (schema is small): decide in the live proof; maxOutputTokens 8000.

---

created: 2026-11-18T09:08:00Z

---

Build done. Live (Sonnet 5.5, Mintleaf, 8 entries): generate 16-18 s, ~4.7k in / 2.6-2.9k out tokens, strict structured output OK (no jsonInPrompt). First live run exposed a prompt bug (skills line copied with its group name) - fixed. Copy 'about 6,000 tokens' -> 'about 7,500 tokens' in SPEC, app, mock. 224 unit + 76 e2e pass (2 consecutive full runs); tooltip flake parked (TASK-44).

---
<!-- COMMENTS:END -->
