---
id: TASK-26
title: Quick generate result, gaps and defaults
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T12:55:00Z'
labels:
  - m9
dependencies:
  - TASK-32
  - TASK-33
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I get both documents with their issues listed, and I can fill a gap straight into my knowledge base. Refs: SPEC §14.3, QG, §18.2 Quick generate result, §18.4 #14–15, Settings defaults.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The result heading gets focus and shows 2 thumbnails with their own downloads, the coverage, gaps and findings counts, and the collapsible issue list
- [x] #2 Download both saves 2 files, gaps never block downloading, and Open in Studio and Regenerate work
- [x] #3 Add to knowledge base on a gap rejects an empty highlight, saves a real one, and Regenerate uses it as a sourced bullet
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- When the pipeline is done, QuickGenerate shows new components/quick/QuickResult.tsx instead of opening the project (SPEC §14.3 Result screen):
  - The h1 "Your documents are ready" (or "Your resume is ready") gets focus (tabindex -1) and is announced. The sub reads "{role} at {company}. Generated in {s}s with {model}."
  - Actions: a "↺ Regenerate" link button, "Open in Studio" (ghost link to /projects/{id}) and primary "Download both" (or "Download resume").
  - Tiles for coverage % (warn below 60), gaps and findings (warn when above 0).
  - A thumbnail per document: the first page as SVG at about 34% in a 300px sunken frame, with a "{n} pages" badge. Each caption has the label, the file name in monospace, Copy text (plainText, toast "{Document} copied as plain text") and its own Download.
  - Issues: a collapsible, open card "{n} items to review before you send" with "Downloads aren't blocked". The rows:
    - Gap: an amber tag and "Add to knowledge base", which opens AddEvidenceDialog. Once saved, the row turns accent with the tag "Added", "Saved to {entry}. Regenerate to use it." and a focused primary Regenerate.
    - Finding: a red tag, by type (the SPEC copy for banned, grounding and coverage).
    - The footer line.
  - No issues gives the accent strip "✓ No gaps or findings. Ready to send."
- Downloads compile with the render worker. The button shows "Preparing" with a spinner, then "✓ Downloaded" for 2 s, and the toast "Downloaded {names}". The download helper moves out of ExportDialog into lib/download.ts.
- Regenerate fetches the fresh KB (GET /api/kb), runs a new pipeline with the same JD and notes, and on success deletes the old project.
- The pipeline adds a coverage finding when coverage is below 60%: "Keyword coverage is {pct}%" / "{first 3 missing} from the job brief don't appear in the resume." (SPEC §10.1)
- The mock generate fixture puts a highlight with evidenceFor first, as the prompt rule says, so an added fact becomes a bullet.

Files
- new components/quick/QuickResult.tsx, new lib/download.ts
- QuickGenerate.tsx, ExportDialog.tsx (use lib/download)
- lib/generate/pipeline.ts (coverage finding)
- lib/llm/mock.ts
- tests/unit/pipeline.test.ts, tests/e2e/quick.spec.ts

Tests
- Unit: coverage below 60% adds a coverage finding with the missing keywords; at or above 60%, none.
- E2E:
  - AC1: after a run the result h1 is focused; 2 thumbnails each with a file name and Download; the 3 tiles; the issue list open, with its count.
  - AC2:
    - Download both triggers 2 downloads with the file names, in the gaps scenario too.
    - Open in Studio goes to the workspace.
    - Regenerate reruns and shows a new result, and the old project is gone (GET → 404).
  - AC3 (?mock=gaps):
    - Add to knowledge base with an empty text shows "Describe what you did".
    - Saving a real Kubernetes fact (to a test-only role made through the API and deleted after) turns the row to Added.
    - Regenerate then leaves 1 gap, and the new project's resume has a bullet whose source is the new highlight.

Out of scope
- Settings defaults (TASK-51)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
components/quick/QuickResult.tsx: focused h1, tiles, 2 thumbnails (svg first page, pages badge, Copy text, Download), Download both (Preparing → Downloaded), issue list with gap rows (AddEvidenceDialog → Added → focused Regenerate) and findings; Regenerate re-reads the KB and replaces the project. Pipeline adds the <60% coverage finding (coverageFinding); lib/download.ts shared with Export.
Review: e2e that writes the KB uses its own portfolio item and the Payments gap (kb.spec and studio.spec read the seed in parallel). 320 unit, 119 e2e pass. Settings defaults split to TASK-51.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T12:48:00Z

---

AC4 (Settings defaults) moved to TASK-51.

---
<!-- COMMENTS:END -->
