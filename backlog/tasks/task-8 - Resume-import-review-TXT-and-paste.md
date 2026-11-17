---
id: TASK-8
title: Resume import review (TXT and paste)
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T11:22:00Z'
labels:
  - m3
dependencies:
  - TASK-32
  - TASK-33
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a new user, I can paste my existing resume or upload a TXT file, review what was found, and choose to merge or replace, so I don't type everything again. Refs: SPEC §1.4, §14.1a, §18.5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pasted text or a TXT upload opens a review draft, and nothing is saved before the user confirms
- [x] #2 Unrecognised sections are kept as Additional sections, and the original text is kept as reference-only
- [x] #3 Merge adds entries and keeps existing contact and work-rights details; replace swaps the KB; existing documents survive both
- [x] #4 Abandoning the draft leaves the saved KB unchanged; invalid, empty and oversized files show clear errors
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach (mock views-import.js; real PDF/DOCX extraction is TASK-11)
- lib/import/parse.ts: port the mock's local parser (pure, runs in the browser: the text never leaves the device). It splits on known headings (experience, volunteer work, education, skills, projects, certifications/awards/publications, references) and turns "Title | Organisation" blocks plus bullet lines into entries and highlights. Unknown headings and the intro become Additional sections (the intro is reference-only), and the whole original text is added as a reference-only "Original resume text (reference)". Missing facts stay absent: no dates, location or work rights are invented. Unlike the mock, a "Work rights" section is kept as an Additional section, not workRights.notes, because a work-rights entry without a status is never saved, so the text would be lost.
- The draft accepts incomplete entries: onboardingDraftSchema lists use .partial() entry schemas (TASK-37 change; complete still validates the whole KB through writeKb).
- /import (shell): a file chooser (accept .pdf,.docx,.txt), the LinkedIn tip, a paste box, the "Every section has a place" callout, an error line (role=alert), "Enter manually instead" and "Extract and review". Errors: unsupported type, over 10 MB, empty file, read failure, and too-short text (mock copy). PDF/DOCX: "Reading PDF and Word files arrives with your AI provider connection. For now, paste the text or choose a .txt file." (TASK-11 replaces this).
- Extract: if an onboarding draft is unfinished, a confirm dialog "Replace the unfinished onboarding draft?" first. Then PUT /api/onboarding { step: 10, maxStep: 10, draft, imported: label } and go to /onboarding/manual (Review).
- Wizard: Review shows the import callout ({label}, "Review each section. Missing information is left blank; unfamiliar sections are preserved under Additional sections."). Entries and contact that miss required fields show a warn "Needs details" pill on their card and their Review row, and Save to knowledge base stops with a toast naming the first such step until they're fixed (Edit → Update validates).

Files: lib/import/parse.ts, lib/schemas/settings.ts, app/(shell)/import/page.tsx, components/onboarding/ImportForm.tsx, components/onboarding/Wizard.tsx, tests/unit/parse-resume.test.ts, tests/e2e/server.ts (shared empty-DB server helper, also used by onboarding.spec), tests/e2e/import.spec.ts, SPEC §14.1a (work rights note, PDF/DOCX message)

Tests
- unit: contact from the first line, email and phone; "Role | Org" + bullets → a role with highlights and no dates; volunteer, education, skills, projects, credentials (kind from heading), referees; unknown headings → Additional; work rights → Additional; intro and original text are reference-only; empty input gives only the original text
- api: PUT accepts a draft role with no dates; complete then 422s until it's fixed
- e2e (own empty-DB server): unsupported, empty, oversized and PDF files show their errors and change nothing (AC4); pasted text opens Review with the callout and nothing is in the KB yet (AC1); abandoning leaves GET /api/kb unchanged (AC4); "Needs details" blocks saving until the role is fixed, then merge keeps the existing contact and adds the entries, with Languages and the original text kept as Additional (AC2, AC3); a TXT upload with the unfinished-draft confirm, then replace swaps the KB (AC3). Projects surviving both modes is covered by the TASK-37 api test.

Out of scope: PDF/DOCX extraction and the provider data-transfer notice (TASK-11); the mock's "Try sample extraction" (mock-only simulation)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Pasted text or a TXT file is parsed on the device (lib/import/parse.ts) into an onboarding draft that opens at Review with an import note; entries missing details show 'Needs details' and block saving until fixed; merge/replace via TASK-37. Unknown sections, Work rights text and the original text are kept as Additional sections. PDF/DOCX show a clear 'arrives with your provider' message (TASK-11). Drafts now accept incomplete entries.
Review: 126 unit + 55 e2e green (import e2e on its own empty-DB server, port 3104); import screen and import Review match the mock. Fixed in review: contact details were taken from anywhere in the text (a referee's email, a date range as phone, a heading as name). Reviewed in the same session that built it.
<!-- SECTION:NOTES:END -->
