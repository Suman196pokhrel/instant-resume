---
id: TASK-11
title: Real resume extraction (PDF, DOCX, TXT)
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T07:59:00Z'
labels:
  - m3a
dependencies:
  - TASK-32
  - TASK-33
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a new user, I can upload my PDF or DOCX resume and have my provider extract it into the review draft. Refs: SPEC §1.4, §14.1a, M3a. Needs the LLM adapter.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PDF and DOCX text is extracted locally and sent to the selected provider only after the data transfer is explained
- [x] #2 Extraction results land in the same review draft as TXT import, with missing facts left blank (work rights never inferred)
- [x] #3 Unknown content is preserved as Additional sections
- [x] #4 Scanned or unreadable files and provider failures show a clear reason and a retry
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- Read files on the device: .txt as now; .pdf with pdfjs-dist 6.5.438 (lazy import, its own worker); .docx with mammoth 1.13.0 browser build (extractRawText, lazy). The extracted text fills the paste box, so the user sees exactly what will be used. All parsing stays in the browser.
- "Extract and review" with a connected model: one dialog explains the transfer before anything is sent. Title "Send your resume to {Provider}?"; body "Your resume text goes straight from this browser to {Provider} ({model}) to sort it into sections. It isn't sent to Instant Resume's server." (+ "This replaces your unfinished onboarding draft." when there is one). Buttons: Send to {Provider} / Read on this device instead / Cancel. Asked every time; no remembered consent.
- With no model connected: the basic on-device parser (lib/import/parse.ts) runs as today, and a note under the button says "Connect a provider in Settings for better extraction. Without one, a basic parser on this device sorts the text." The unfinished-draft confirm stays as is.
- lib/import/extract.ts: extractionSchema (Zod; every field a required string, "" when absent, so it works with all three providers' structured output) for contact, roles, volunteering, portfolio, education, skills, credentials, referees, additional. Each highlight comes back as { text, metric, skills }: metric copied verbatim from that bullet ("" if none), skills named in that bullet. These are existing KB fields that later stages reuse (Studio matching, match evidence, number grounding §10.3), so one call fills them and the user reviews them once; nothing new is stored. Skill groups are deduplicated. No workRights field: work-rights text goes to Additional. extractResume(text, adapter, signal) calls getAdapter().generateObject({ name: "extract", maxOutputTokens: 16000 }) and maps the result to the same ParsedDraft shape parseResume returns (empty fields dropped), then appends the reference-only "Original resume text (reference)" section itself, never trusting the model for it. The same PUT /api/onboarding -> Review flow follows.
- Adapter: optional maxOutputTokens on GenerateArgs, passed to generateText. The Anthropic SDK defaults to 4096 for model IDs it doesn't know, which truncates a long resume.
- States: while extracting, the button reads "Extracting…", with a live region "Sorting your resume with {Provider}. This usually takes 10 to 30 seconds." and a Cancel button (AbortController; cancel returns to the form with the text intact). Provider failure: LlmErrorCallout with Try again, plus "Read on this device instead" still available.
- New file errors: scanned PDF (under 50 non-space characters of text): "This PDF has no selectable text, so it looks like a scan. Export it again as a text PDF, or paste the text." Password-protected PDF: "This PDF is password-protected. Remove the password, or paste the text." A corrupt PDF or DOCX uses the existing "Could not read the file. Try another file or paste its text."
- Mock: an "extract" fixture returns parseResume's result for the text inside <resume> (via a small draft-to-extraction mapper), so e2e proves the file text reaches Review. A new scenario `extract-error` fails the first extract call with a busy error, then succeeds (SPEC §17).

Files
- new: lib/import/read-file.ts (pdfText, docxText, readResumeFile -> { text } | { error }), lib/import/extract.ts, tests/unit/extract.test.ts, tests/fixtures/import/{resume.pdf,resume.docx,scanned.pdf,broken.pdf} (made once with LibreOffice from the Jordan text), tests/e2e/import-extract.spec.ts
- edit: package.json, lib/llm/adapter.ts (maxOutputTokens), lib/llm/mock.ts (extract fixture, extract-error), components/import/ImportForm.tsx, tests/e2e/import.spec.ts (the PDF/DOCX "arrives with provider" case goes), docs/SPEC.md §1.4, §14.1a, §17, AGENTS.md if needed. The mock stays simulated: it never sends files (its copy already says so).

Tests
- AC1 e2e: upload resume.pdf and resume.docx -> their text appears in the box; with Anthropic connected (stubbed key test), Extract shows the transfer dialog naming Anthropic and the model before any call; Cancel sends nothing. Unit: extractResume sends the text inside <resume> with name "extract" and maxOutputTokens.
- AC2 unit: the mapping fills the ParsedDraft shape, highlights keep metric and skills, a metric not found verbatim in its bullet is dropped; "" fields are dropped; work-rights text is never mapped to workRights; the reference-only original text is appended. e2e (mock): Send -> Review opens with the imported note, and the roles from the PDF are listed.
- AC3 unit: model "additional" sections are kept; e2e sees an unknown section under Additional sections.
- AC4 e2e: scanned.pdf, broken.pdf and a password-protected PDF show their messages and leave the KB unchanged; ?mock=extract-error shows the callout, then Try again opens Review; Cancel mid-extract keeps the text and makes no draft.
- Live (opt-in, Anthropic): one manual run in pnpm dev with the .env.keys key on resume.pdf, recorded on the card.

Out of scope
- OCR for scanned PDFs (clear message instead), sending the PDF file itself to the provider, remembering consent, grounding checks on extracted fields beyond the metric (the user reviews every field before saving), the mock's simulated PDF flow.
- Embeddings: Anthropic has none, and keyword matching over ~50 highlights doesn't need them.
- Prompt caching of the KB across brief/match/generate calls (TASK-41, parked for M5).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
PDF/DOCX/TXT read on the device; with a connected model one consented extract call (jsonInPrompt: Anthropic rejects big strict grammars) fills the review draft including each highlight's metric and skills; on-device parser otherwise. Live-verified on Anthropic (4.7 s, ~2k in / 0.5-1.4k out tokens). Follow-ups: TASK-41 prompt caching, TASK-42 dev reload loop.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T07:58:00Z

---

Live 2026-11-18 (production build, real Anthropic key, Chromium): resume.pdf -> Send to Anthropic -> Review in 4.7 s; 2 roles, metrics copied exactly, skills per bullet, work rights empty, LANGUAGES kept. Node probe on the same text: Sonnet 5.5 3.1 s 2050 in / 528 out; Haiku 5.5 5.3 s / 1370 out; Opus 5.5 8.1 s / 1007 out. Strict structured output was rejected ('compiled grammar is too large'), so extract uses jsonInPrompt. 171 unit + 68 e2e pass.

---
<!-- COMMENTS:END -->
