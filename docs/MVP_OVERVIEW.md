# Resume Tailor: MVP Overview

Updated 8 November 2026 | Product and delivery decisions

## One focused problem

Turn a pasted job description and the user's real experience into a tailored resume and cover letter. Keep background information reusable, edits reviewable, and documents easy to export. The product prepares application documents; it does not find jobs, submit applications, or manage a hiring pipeline.

## Confirmed direction

- Open source, with code and collaboration on GitHub. Build in public through documented decisions, changes and reproducible releases.
- The real application runs locally on the user's machine. Users bring their own AI provider keys (BYOK) and pay their selected provider directly.
- Vercel hosts a simulated interactive product demo. It does not host the real-user backend, database or live AI generation service.
- No paid subscription, billing, managed SaaS, or live public AI demo is planned.
- A custom domain is optional. GitHub publication, Vercel configuration and deployment remain pending tasks, not completed capabilities.

## What exists today

The repository contains a plain HTML, CSS and JavaScript mock, plus product and implementation documentation. It demonstrates the core interactions with sample data. The local Next.js application, real provider integration and real PDF/DOCX extraction are still implementation targets.

## How to read the project documents

CURRENT_SCOPE.md governs product and platform decisions. BUILD_SPEC.md defines implementation within that scope. The mock guides interactions and visual details. This overview summarises those documents; it does not override them.

This edition replaces the October overview. Its original content remains in Git history. MVP_OVERVIEW.md is the editable source for this PDF; regenerate the PDF when the source changes.

<!-- pagebreak -->

# Background to application

## 1. Set up the knowledge base

Choose manual onboarding or import an existing resume. Both paths feed the same editable knowledge base: contact details, work rights, paid experience, volunteer work, portfolio items, education, skills, credentials, referees, and additional sections.

The manual wizard has eleven steps including Review. Background sections are optional; paid experience is not required. Volunteer-only and education-based backgrounds must be supported. Name and a valid email are required before final saving.

Import accepts PDF, DOCX and TXT files up to 10 MB, or pasted text. Extract into a draft, not directly into the saved knowledge base. Leave missing facts blank. Preserve unfamiliar sections and retain the original text as reference-only material, excluded from automatic document selection.

Users inspect and correct each section before confirming. Review offers explicit merge or replace behavior: merge adds entries while retaining existing contact/work-rights details; replace uses the reviewed background. Saved application documents remain intact. Confirm before replacing an unfinished onboarding draft. JSON backup restore is a separate action from resume import.

## 2. Prepare an application

From Applications, select New application and choose a path for a pasted job description:

- Quick generate: extract the brief, match experience, draft documents, fit pages, and run checks. Show progress, findings, cancellation and retry. Open the result in Studio for further changes.
- Studio: review the extracted job brief, choose relevant knowledge-base entries, generate documents, then edit with more control.

## 3. Review, edit and export

Edit text manually or request an AI rewrite of one section. Inspect the proposed difference and accept or reject it. Reorder or hide sections, adjust fonts and spacing, inspect checks, browse history, restore versions and export documents. Formatting changes do not need an AI call.

Applications is a searchable collection of saved job descriptions and documents, with open, duplicate and delete actions. It is not an application-status tracker. Main navigation contains only Applications, Knowledge base and Settings.

<!-- pagebreak -->

# Two clearly separated experiences

## Real local application

Users install and run the app locally, configure their own supported provider, and supply their own career information. Real extraction, generation and rewrites use that provider. SQLite stores application data locally; API keys are stored separately on the device and excluded from backups.

The current design sends AI requests directly from the browser to the provider. Explain that local storage does not mean AI processing is offline: the relevant input goes to the user's selected provider. Validate provider support during implementation. Generation requires the browser to remain open under this design.

PDF output in the real app uses a Typst Web Worker. The worker renders documents; it is not a durable background job service.

## Public simulated demo on Vercel

Visitors should be able to try sample background information and sample job descriptions without an account, payment, installation or API key. The initial deployment serves only the static mock directory, with no database or application API server.

Display a visible notice: Interactive demo - Sample data - AI responses are simulated. Use fixtures or deterministic transformations for generation and AI rewrites. Manual text editing, layout changes, history and browser-local saving can remain genuinely interactive; every edited document need not be prepared beforehand.

Current mock limitations must stay explicit:

- PDF/DOCX uploads preview labelled sample extraction, not the uploaded document's actual contents.
- TXT uploads and pasted text use a basic local parser and require review. Unknown content and original text are retained.
- Document preview is HTML. Export opens the browser print dialog for Save as PDF; it does not perform real Typst compilation.
- Provider labels, sample connections, artificial delays and generation results are demonstrations, not validated live integrations.

Before public deployment, disable real API-key collection and provider calls, provide a clear reset action, explain browser-local storage, and use synthetic examples. Uploads in demo mode stay in the browser. Add actual GitHub and local-setup links once available. These are release requirements, not claims that the present mock already satisfies every public-demo check.

<!-- pagebreak -->

# Engineering scope

## Local implementation plan

The build spec selects Next.js with TypeScript, local SQLite via libSQL, Drizzle migrations, Zod validation, React Hook Form and Zustand. The interface uses shadcn/ui and Tailwind; document layout uses Typst in a Web Worker. The provider adapter uses the Vercel AI SDK. Using that SDK does not require hosting the real application on Vercel.

Keep four responsibilities separate: the knowledge base, tailored document content, design settings, and checks. Changes to layout go directly to rendering. AI generation and section rewrites return validated structured operations; users can inspect proposed changes and undo accepted ones.

Verify current SDK APIs, supported models and browser access against official provider documentation when implementing. Names and timings in the mock are fixtures, not production configuration.

## Evidence and document quality

Resume bullets reference stored highlights. Checks cover source references, unsupported numbers and technologies, generic phrases, keyword coverage, and document readability. Missing evidence must be visible rather than replaced by invented experience.

Source IDs and heuristic checks are safeguards, not proof that every sentence is factually correct. Users review generated claims. Keep keyword coverage separate from parse/readability checks; do not claim a universal ATS score or guaranteed interviews.

## Persistence and recovery

Save reviewed knowledge-base records, application documents and revisions locally. Support undo, history and JSON backup/restore, excluding keys. Validate imports and schema migrations. Preserve drafts and earlier pipeline results when handling failures, as defined in the build spec.

Do not introduce cloud databases, always-on workers or distributed infrastructure just to serve the demo. Durable execution after browser closure would require an explicit architecture decision about job state and key handling; it is not promised by the current design.

## Terminology

- Application: the user-facing workspace for one target job; internally the data entity is Project.
- Portfolio item: a personal, academic or work project used as career evidence.
- Knowledge base: the user's reusable record of background and achievements.
- Generation: the initial document draft. Rewrite: an AI proposal limited to a selected section. Edit: a manual change. Adjustment: a design change.
- Gap: a requirement without supporting evidence in the knowledge base. Finding: an issue raised by checks.

<!-- pagebreak -->

# Delivery and acceptance

## Build and verify

Follow the detailed milestones in BUILD_SPEC.md: scaffold and schemas, renderer spike, manual/import onboarding, real extraction and provider connections, Studio generation, editing, checks, history/export, Quick generate, backups, and public release preparation.

Use deterministic fixture providers in automated CI. Test import review, missing/unknown sections, merge/replace, volunteer-only and education-only backgrounds, targeted rewrites, history and export. Separately verify actual provider connectivity and real PDF/DOCX extraction. Passing mock tests does not demonstrate live AI quality.

The real local app should work from documented installation and migration steps with an empty user knowledge base. Synthetic seeding is optional. Publish setup, contribution and testing instructions; choose and add the owner's distribution license before release. The license is still an unresolved release choice.

## Public demo release checks

- Serve the demo independently of the local application server. Verify navigation, reloads, import review, both generation paths, editing, history, persistence, reset and export.
- Check that no interaction sends provider requests, collects real keys, uploads documents or calls a real application backend. The live adapter must not be enabled through URL parameters or saved preferences.
- Show simulation and export limitations clearly. Test keyboard access, narrow screens and reduced-motion behavior.
- Publish only intended public assets and synthetic fixtures. Run checks before production promotion; use preview deployments for review when useful.
- Add repository and demo URLs to the documentation only after publication. A hosted mock does not satisfy the real-app acceptance criteria; a working local app does not by itself satisfy public-demo release checks.

## Explicit exclusions

No job scraping, discovery inbox, scheduled sweeps, batch tailoring of discovered jobs, listing-trust scores, contact discovery, outreach, application-stage tracking, career maps, timing analytics or resume experiments.

No paid plans, billing, public multi-tenant backend, live public AI service, cloud sync, accounts or multi-device support. Multi-column layouts, DOCX export, additional templates, LinkedIn integration, MCP/chat integrations, interview-style onboarding and dark mode remain outside this MVP. DOCX import is in scope; DOCX export is not.

## Keep the documents aligned

Change CURRENT_SCOPE.md and relevant build-spec sections alongside product changes. Update MVP_OVERVIEW.md and regenerate this PDF whenever those decisions affect the overview. Keep completed, simulated and planned behavior distinct. Preserve the narrow goal: reliable application documents grounded in the user's own experience.
