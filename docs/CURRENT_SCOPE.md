# Resume Tailor: current product scope

Updated 8 November 2026. This scope supersedes conflicting rollout and import decisions in the historical PDF overview. The build specification describes the intended application; `mock/` demonstrates its interactions.

## Goal

An open-source, locally hosted tool that turns a pasted job description and the user's real background into editable application documents. Users bring their own AI provider keys. No subscription, billing, or managed service in this scope.

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

## Success for this iteration

- Only Applications, Knowledge base and Settings remain in main navigation.
- Both onboarding paths lead to a reviewable, editable knowledge base.
- Imported details can be used by Quick generate and Studio.
- Saving an import does not silently mix in demo background or overwrite existing data.
- The removed features have no screens, navigation links or active script dependencies.
- Existing document editing, checks, history and exports remain available.

## Documentation discipline

Update this scope and the relevant build-spec flow in the same commit as behavior changes. Keep the October PDF as a historical brief; it is not the current authority on resume import or launch scope. Choosing and adding the distribution license remains a release decision; no license has been inferred during this mock revision.
