# Resume Tailor: current product scope

Updated 8 November 2026. This is the authority for product and platform decisions. Read it before `BUILD_SPEC.md`, which defines implementation within this scope. `mock/` guides interactions. `MVP_OVERVIEW.md` and its generated PDF summarise the current decisions without overriding this scope or the build spec; the superseded October PDF remains in Git history.

## Goal

An open-source, locally hosted tool that turns a pasted job description and the user's real background into editable application documents. Users bring their own AI provider keys. The code will be published on GitHub and developed in public. Vercel will host a simulated public product demo. No subscription, billing, live public AI service, or managed real-user application is in scope.

## Agreed platforms and operating modes

| Concern | Decision |
|---|---|
| Source, issues and contributions | Public GitHub repository; build in public |
| Full application | User-operated local app with a local database and user-owned provider keys |
| AI costs | User pays their selected provider directly; no platform credits or subscription |
| Public experience | Simulated interactive product demo on Vercel |
| Initial demo artifact | Existing static `mock/` HTML/CSS/JavaScript, not the future full Next.js server |
| Demo data and processing | Synthetic fixtures and browser-local edits; simulated provider responses; no backend or live AI |
| Domain | Optional; a hosting-provided address is sufficient initially |
| Current status | Local mock and docs exist. GitHub publication, Vercel configuration and deployment are separate pending work |

### What the demo demonstrates

Visitors can explore sample career information and job descriptions, choose Quick generate or Studio, review simulated results, edit text and layout, inspect checks/history and try export. They need no account, API key, payment or installation. A visible “Interactive demo · Sample data · AI responses are simulated” notice must distinguish the demo from the real application.

Generation, extraction and AI rewrite proposals may use fixtures or deterministic transformations. Manual edits, history, local saving and rendering remain interactive; there is no requirement to prebuild every possible edited document. Current PDF export uses the browser print dialog; Typst compilation is a real-application implementation target, not a completed mock capability.

Before public deployment, disable real API-key collection and live-provider paths, make reset easy to find, explain local data storage, and keep personal uploads optional with a sample-first path. Link to the source repository and local setup instructions once they exist. Do not label the current mock a fully implemented AI product. These are deployment requirements, not claims that this documentation-only change has implemented them.

### Engineering boundaries

Keep one narrow user problem: preparing tailored application documents from stored experience. CI, reproducible local setup, validated AI outputs, useful error handling and evaluation support that problem. Public multi-tenant infrastructure, remote workers, always-on jobs, and cloud databases are not required by the demo. If durable background execution later becomes necessary, document its need and key-handling implications before changing the browser-direct provider design.

## Primary flow

1. Build the knowledge base manually, or upload an existing resume / paste its text.
2. Review, correct and confirm contact details, employment, volunteer work, portfolio items, education, skills, credentials, referees, and additional sections.
3. From Applications, start a new application for a pasted job description. Choose Quick generate for the automated pipeline, or Studio to review the job brief and select evidence before generation.
4. Edit the resume and cover letter, inspect checks, adjust layout, review history, and export.
5. Reopen saved applications and maintain or back up the knowledge base.

## Import boundaries

Nothing is saved to the knowledge base before review. Missing facts stay blank. Unrecognised sections are retained rather than silently discarded. The original text is reference-only and is not automatically included in generated resumes. Importing a resume is distinct from restoring a JSON backup.

Review offers two explicit save modes: add entries while keeping existing contact/work-rights details, or replace the knowledge base. Existing application documents are preserved. Sample-data replacement is selected by default for demo onboarding. A draft import can be abandoned without changing the saved KB.

The mock accepts PDF/DOCX uploads to demonstrate the review flow with **labelled sample extraction**, not actual document parsing. TXT uploads and pasted text use a basic local parser; users must review its categorisation and missing fields. Full PDF/DOCX extraction through the user's provider belongs to the implementation phase. No AI provider calls occur in the mock.

Volunteer-only backgrounds must work. Additional sections remain editable and available for selection. Manual input and imports feed the same knowledge base and document workflows.

## Removed from the mock

- Job scraping, discovery, matching inbox, source connections and scheduled sweeps.
- Batch generation from discovered jobs.
- Application-stage tracking, listing-trust judgments and outreach suggestions.
- Career maps, hiring funnels, timing analytics and resume experiments.

The dashboard is a list of saved application documents, not a job-search CRM.

## Feature acceptance for the simplified mock

- Only Applications, Knowledge base and Settings remain in main navigation.
- Both onboarding paths lead to a reviewable, editable knowledge base.
- Imported details can be used by Quick generate and Studio.
- Saving an import does not silently mix in demo background or overwrite existing data.
- The removed features have no screens, navigation links or active script dependencies.
- Existing document editing, checks, history and exports remain available.

## Release acceptance

- The local application has reproducible setup instructions, real BYOK operation, and tests; simulated behavior is not passed off as completed provider integration.
- GitHub contains an explicit license selected by the owner, synthetic fixtures, contribution guidance and a clear account of completed versus planned work.
- The Vercel artifact is demo-only and passes the public-demo checks in the build spec. It contains no real provider credentials and does not require a local API server.
- The public demo/source URLs are added to documentation only after they exist. No deployment is implied by documenting these decisions.

## Documentation discipline

Update this scope and the relevant build-spec flow in the same commit as behavior changes. Update `MVP_OVERVIEW.md` and run `python scripts/render_overview.py` from the repository root when the overview changes; commit its source and generated PDF together. Review the rendered pages before committing. Choosing and adding the distribution license remains a release decision; no license has been inferred during this mock revision.
