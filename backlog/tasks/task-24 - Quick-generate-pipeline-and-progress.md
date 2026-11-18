---
id: TASK-24
title: Quick generate pipeline and progress
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T12:44:00Z'
labels:
  - m9
dependencies:
  - TASK-50
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I paste a job description and watch a 5-stage pipeline produce finished documents. Refs: SPEC §14.3, QG, §18.1 Pipeline, §18.2 Quick generate progress, §18.4 #3–5. Mock: views-quick.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The 5 stages each show pending, active, done, warning and error states, driven by pipeline events with live partial results
- [x] #2 The overall bar and elapsed time are shown, progress is monotonic, and stage changes are announced
- [x] #3 Cancel stops the run, keeps the text, and creates no project
- [x] #4 An error shows Retry from this step, which completes the run, and Start over keeps the text
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- New lib/generate/pipeline.ts, createPipeline(input, deps), an event emitter (SPEC §14.3). The UI only listens; run(from = 0), cancel(). The context (brief, match, docs, pages, checks) is kept between runs, so Retry starts from the failed stage. The stages:
  1. read: extractBrief
  2. match: matchEvidence. Emits the entry and skill names, plus the gaps (warning).
  3. write: generateDocuments with the match's selection, the notes, tone and spelling. Emits draft events (summary, each bullet, the letter opening). With the cover letter off, only the resume is kept.
  4. fit: compiles each document to PDF and emits pages; note "Resume {n} pages, cover letter {m} page". The fitting loop is TASK-25.
  5. check: runChecks on both documents. Coverage = matched/keywords on the resume, plus the findings (warning).
- Events:
  - progress is monotonic: stage i spans i/5 to (i+1)/5.
  - stage is {index, id, label, status, note}.
  - error carries {index, label, reason}. A provider error gives the LlmError's title and detail; otherwise the SPEC reason for that stage.
  - An aborted run emits nothing more.
- Only after all 5 stages succeed is the project saved (POST /api/projects, source "quick", gaps), then done {projectId, summary}.
- deps: kb, prefs, getAdapter, compile(kind, doc) returning pages, save(project, documents) returning an id, and failOnce?: stageIndex. In mock mode, ?mock=error-stage-N fails stage N once, the same scenarios as the mock.
- New components/quick/QuickGenerate.tsx on /new/quick (the page loads kb and prefs as Studio's does):
  - Input:
    - h1, sub, the no-key warn callout and the JD textarea with its character count.
    - A notes textarea with its help line.
    - Generate (spark), disabled until there's text and a connection; under 80 characters it shows the SPEC message.
    - The "⚡ Uses your knowledge base…" and Defaults lines, with a Settings link.
    - The draft (JD and notes) persists in localStorage, like Studio's.
  - Progress:
    - h1 "Generating your documents", which becomes "Generating for {role} at {company}"; the sub line; Cancel.
    - The overall bar with {pct}% and the elapsed time.
    - 5 stages: 26px icons for pending, active, done, warning and error, a connector line, the notes, and sr-only state text. A status region announces stage changes.
    - Live cards: Job brief (must-have chips, ✓ or ⚠ after the match), Matched, Draft (mini page), Page fit, Checks. They scroll into view (block nearest, smooth unless reduced motion).
  - Cancel aborts, returns to input with the text kept, and toasts "Generation cancelled. Your job description is still here."
  - Error: the stage turns red with its reason, and a callout (role alert) reads Stopped at "{label}", "{reason} The steps before this one are kept.", with "Retry from this step" (focused) and "Start over".
  - Done: router.push to /projects/{id} for now. TASK-26 replaces it with the result screen.

Files
- new lib/generate/pipeline.ts
- new components/quick/QuickGenerate.tsx
- app/(shell)/new/quick/page.tsx
- new tests/unit/pipeline.test.ts, tests/e2e/quick.spec.ts

Tests
- Unit (pipeline, mock adapter, fake compile and save):
  - stage events run active → done in order, with live events (brief, match, draft, pages, checks) and monotonic progress; save happens once, after check
  - the gaps scenario gives stage 2 a warning with the gaps
  - cancel mid-run emits no more events and never saves
  - failOnce 3 emits an error at write; run(2) completes, reusing the brief and match (the extract call isn't made again)
- E2E (mock, connected):
  - AC1/2: Mintleaf runs all 5 stages to done, with the cards, a 100% bar and the elapsed time. Generate is disabled until there's text and a key.
  - AC3: Cancel during the write stage returns to input with the text, toasts, and no project is created (the projects API count is unchanged).
  - AC4: ?mock=error-stage-3 stops with the callout, "Retry from this step" is focused, Retry completes and opens the project; Start over keeps the text.

Out of scope
- The result screen, Settings defaults, theme preset and page budget (TASK-26); the fitting loop (TASK-25); the sample-JD button (demo only)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
lib/generate/pipeline.ts (event emitter, 5 stages, monotonic progress, save only at the end, run(from) keeps context, failOnce for ?mock=error-stage-N) and components/quick/QuickGenerate.tsx (input with draft, progress with stage icons, live cards, Cancel, error callout with Retry/Start over). On done it opens the project; TASK-26 adds the result screen.
Review: fixed an effect that returned Chrome's scrollIntoView promise (React took it for a cleanup); runChecks lets cover letter paragraphs quote the ad's numbers (SPEC §10.3, mock); studio.spec locator made robust to kb.spec's parallel rename. 312 unit, 117 e2e pass.
<!-- SECTION:NOTES:END -->
