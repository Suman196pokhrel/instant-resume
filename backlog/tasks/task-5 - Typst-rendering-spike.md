---
id: TASK-5
title: Typst rendering spike
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T10:22:00Z'
labels:
  - m2
dependencies:
  - TASK-32
  - TASK-33
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I see my resume and cover letter rendered as real PDFs from my data, fast enough to feel instant. De-risks the biggest unknown early. Refs: SPEC §9.1–9.3, §19 M2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A Web Worker compiles the seed resume and cover letter with the bundled fonts into PDFs
- [x] #2 A re-render after a theme change is measured and reported; target under 300 ms
- [x] #3 The PDF text is selectable and its reading order starts with the name
- [x] #4 The worker is lazy-loaded only on the Workspace and Quick generate pages
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach (a spike: prove compile time and PDF quality; record the numbers on the card)
- Add @myriaddreamin/typst.ts with the typst-ts-web-compiler WASM, version 0.7.0 pinned. Read its bundled docs for the 0.7 API (createTypstCompiler, font loading, a shadow file for /data.json, compile to pdf). The WASM is served as a static asset: new URL(…, import.meta.url) if Turbopack handles it, otherwise copied to public/typst/ by a script.
- Fonts in public/fonts: Liberation Sans and Carlito (regular, bold, italic, bold italic) copied from the system packages; Inter from the official rsms/inter release. All SIL OFL, with their licence files next to them. Every font is loaded into the compiler, and nothing falls back to system fonts.
- lib/render/templates/resume.typ and letter.typ follow SPEC §9.2. They read /data.json { document, kb: {contact, workRights}, brief, paper, spelling }, use a single column, keep contact details in the body, and use no tables or images. The work rights line is en-AU only; the letter date is formatted en-AU.
- lib/render/worker.ts: { type:"compile", id, kind, data, format:"pdf" } → { id, pages, artifact, ms }, or { id, error }. It loads the compiler and fonts once, then reuses them; the page count comes from the compiled document. lib/render/client.ts: render(kind, data) starts the Worker lazily on first call and matches replies by id.
- Lazy loading: the Workspace (/projects/[id]) and Quick generate (/new/quick) placeholder pages mount <RenderWarmup/>, which dynamically imports the client and starts the worker. No other page imports lib/render. The loader card UI is TASK-15 and TASK-24.
- /dev/render, a dev page gated like /dev/ui: "Render resume" and "Render cover letter" use tests/fixtures/resume.json and cover-letter.json (synthetic, built from the Jordan Whitlock KB); "Change theme" re-renders with baseSize +0.5. Shows "Rendered in {ms} ms · {n} pages" and download links.
- Report on the card: WASM size (raw and gzip), first-load time, cold and warm compile ms, theme re-render ms.

Files
- package.json, public/fonts/*, lib/render/{worker,client}.ts, lib/render/templates/{resume,letter}.typ, components/render/RenderWarmup.tsx, app/(shell)/projects/[id]/page.tsx, app/(shell)/new/quick/page.tsx, app/(shell)/dev/render/page.tsx (+ a client component), tests/fixtures/{resume,cover-letter}.json, tests/e2e/render.spec.ts

Tests (e2e on the production build)
- AC1: /dev/render compiles both documents; each download is a PDF (%PDF) with at least 1 page; pdffonts reports every font embedded.
- AC2: after "Change theme", the shown ms is a number; the test logs it and warns (does not fail) above 300.
- AC3: pdftotext of the resume: the first non-empty line is "Jordan Whitlock", then the contact line; Summary comes before Experience, which comes before Skills; a known bullet appears whole (selectable text). The letter has "Dear Hiring Manager," before "Kind regards,". Skipped if pdftotext is missing.
- AC4: loading /dashboard, /kb/roles and /settings requests no typst WASM and starts no worker; /projects/sample and /new/quick do (requests and Worker creation recorded).

Out of scope
- SVG/vector preview and the loader card (TASK-15, TASK-24); export dialog and file names (TASK-23); page fitting (TASK-25); click-to-select sections.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Spike results (local production build, Chromium): typst-ts-web-compiler WASM 28.3 MB raw / 10.8 MB gzip (SPEC's 6.4 MB is a mock figure; the loader card must show the real size). Fonts 5.9 MB for 12 TTFs, all loaded at start. Cold first resume (WASM + fonts + compile) 911 ms; cover letter 6 ms; theme re-render 13 ms (target 300 ms). PDFs: A4, fonts embedded, pdftotext order name → contact → Summary → Experience → Skills.
Follow-ups: load only the active font family to cut first load; calibrate template spacing against the mock in TASK-15; the SVG/vector preview needs @myriaddreamin/typst-ts-renderer (TASK-15). Review: concurrent renders verified isolated (runWithWorld snapshots shadow files); no fixes needed.
<!-- SECTION:NOTES:END -->
