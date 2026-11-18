---
id: TASK-23
title: Export PDF
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T12:29:00Z'
labels:
  - m8
dependencies:
  - TASK-32
  - TASK-33
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can save my resume and cover letter as PDFs with sensible file names. Refs: SPEC §9.3, US10, §18.4 #10.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The export dialog shows both file names (Firstname-Lastname-Resume-Company.pdf and the …-Cover-Letter-… one), with the company sanitised
- [x] #2 The PDF downloads, its text is selectable, and the reading order starts with the name (asserted with pdf.js)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- The bar gets a primary "Export PDF" button after the tool group's divider and before the model picker. It opens new components/workspace/ExportDialog.tsx (SPEC §9.3; mock openExport):
  - Two checkbox cards, Resume and Cover letter, each showing its file name in monospace. The active document is pre-ticked.
  - A warn callout "Checks found {n} issues across both documents. You can still export." when runChecks finds any across both documents.
  - The note "{paper}, single column, selectable text in reading order."
  - Cancel, and Export PDF. Export is disabled with nothing ticked; the mock toasts instead, but a disabled button is clearer and needs no error.
- Export compiles each ticked document in the existing render worker (format pdf), showing a spinner and "Compiling with Typst". It downloads each file through a Blob and a[download], closes, and toasts "Exported {a} and {b}". A compile failure toasts an error and keeps the dialog open.
- New lib/doc/filename.ts, fileName(name, kind, company), reused by TASK-26:
  - Name parts are hyphen-joined on whitespace.
  - The company is sanitised to [A-Za-z0-9-]: runs of anything else become "-", trimmed.

Files
- new lib/doc/filename.ts, tests/unit/filename.test.ts
- new components/workspace/ExportDialog.tsx
- Workspace.tsx (the button)
- new tests/e2e/export.spec.ts

Tests
- Unit:
  - "Jordan Whitlock" + "Southerly Energy (AU) Pty." gives Jordan-Whitlock-Resume-Southerly-Energy-AU-Pty.pdf, and Cover-Letter for the letter.
  - Extra spaces in the name collapse.
- E2E:
  - AC1: the dialog shows both names, with the company sanitised. The resume is pre-ticked, or the cover letter when it is the open document. A project with a finding shows the warn callout.
  - AC2:
    - Export downloads Jordan-Whitlock-Resume-{Co}.pdf. pdf.js (pdfjs-dist, already installed) reads its text: the first text item is "Jordan Whitlock", and it contains the summary text.
    - Ticking both downloads 2 files and toasts both names.

Out of scope
- Page fitting (TASK-25); Quick generate downloads (TASK-26)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Export PDF (components/workspace/ExportDialog.tsx, lib/doc/filename.ts): checkbox cards with sanitised file names, the open document pre-ticked, a checks warning, Typst compile in the worker, a download per file and the Exported toast.
Review: pdf.js e2e confirms the text starts with the name; Export is disabled with nothing ticked (SPEC and mock updated). 303 unit, 113 e2e pass.
<!-- SECTION:NOTES:END -->
