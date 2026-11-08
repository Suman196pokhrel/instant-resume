# Resume Pipeline

Resume Tailor is an open-source, locally hosted product exploration using your own AI provider keys. The current repository contains documentation and a plain HTML, CSS, and JavaScript mock; no subscription or hosted service is planned in this scope.

## Files

- [Current scope](docs/CURRENT_SCOPE.md): goals, supported flows, and mock limitations.
- [Original MVP overview](docs/Resume%20Tailor%20MVP%20Overview.pdf): historical October brief; current scope supersedes its import and rollout decisions.
- [Build specification](docs/BUILD_SPEC.md): proposed resume-tailoring MVP and its acceptance criteria.
- [Interactive mock](mock/index.html): current interaction exploration with seeded demo data.

Open the mock locally:

```sh
xdg-open mock/index.html
```

The mock supports opening directly from the filesystem. AI generation and PDF/DOCX resume extraction are simulated; TXT uploads and pasted resume text use a basic local parser. The mock does not call AI providers. Review imported details before saving; unrecognised content and original text are retained. It is not a production service.

## Scope and documentation

The mock now focuses on one workflow: enter background manually or import a resume → review the knowledge base → create an application from a pasted job description → use Quick generate or Studio → edit and export. The dashboard lists saved application documents.

Job scraping, discovery, schedulers, career maps, experiments, listing-trust checks, outreach, and application-stage tracking have been removed. Volunteer work and additional sections are supported in onboarding, knowledge-base editing, and document generation. The original resume text is retained as reference material and excluded from automatic document selection.
When a product behavior changes, update its relevant Markdown documentation in the same commit, or explicitly record that it remains an experiment. Keep the PDF as the historical brief until a revised edition is deliberately produced. Git records changes; it does not automatically reconcile the mock and specification.

## Local version control

This project uses local Git tracking. Review and commit a change with:

```sh
git status
git diff
git add <changed-files>
git commit -m "Describe the product change"
```

Credentials, personal runtime data, dependencies, and generated output are excluded through `.gitignore`. The mock's browser-stored state is separate from the tracked source files.
