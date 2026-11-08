# Resume Pipeline

Resume Tailor is an open-source application being built in public. It turns a pasted job description and a reusable record of your experience into a tailored resume and cover letter.

- **Source and collaboration:** GitHub.
- **Real application:** self-host locally, bring your own AI provider key (BYOK), and pay that provider directly.
- **Public product demo:** a simulated, interactive experience hosted on Vercel, with sample data and no live AI calls.
- **Business scope:** no SaaS offering, paid subscription, billing, or managed real-user backend.

These are the agreed destinations, not a claim that publication or deployment is complete. This checkout currently contains documentation and a static mock; the real application is still to be implemented.

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

## Guidance for contributors and implementing LLMs

Read [Current scope](docs/CURRENT_SCOPE.md) first, then [Build specification](docs/BUILD_SPEC.md), then inspect the mock. Current scope governs product/platform decisions; the build spec governs implementation within that scope; the mock guides interactions and visual details. The October PDF is historical context only.

Keep real local operation and the public demo distinct. The local app needs real provider integration and persistence. The Vercel demo uses simulated extraction/generation, browser-local state, and sample fixtures; manual edits, layout changes, and history can remain genuinely interactive. It must not request real provider keys or imply that simulated results are real AI output. See the build spec's public-demo acceptance criteria before deployment.

The chosen Vercel host does not require moving the real app's SQLite database or API handlers into the cloud. Do not add cloud infrastructure, auth, billing, scraping, or background services solely for the demo.

## Scope and documentation

The mock now focuses on one workflow: enter background manually or import a resume → review the knowledge base → create an application from a pasted job description → use Quick generate or Studio → edit and export. The dashboard lists saved application documents.

Job scraping, discovery, schedulers, career maps, experiments, listing-trust checks, outreach, and application-stage tracking have been removed. Volunteer work and additional sections are supported in onboarding, knowledge-base editing, and document generation. The original resume text is retained as reference material and excluded from automatic document selection.

When a product behavior changes, update its relevant Markdown documentation in the same commit, or explicitly record that it remains an experiment. Keep the PDF as the historical brief until a revised edition is deliberately produced. Git records changes; it does not automatically reconcile the mock and specification.

## Publication and demo plan

The public repository will contain source, documentation, tests and reproducible setup instructions. The Vercel demo initially serves only `mock/`; it needs no backend, database or live provider credentials. Automated checks should precede production demo deployment. The exact repository URL, Vercel project, domain and open-source license are not yet selected/configured here. A custom domain is optional.

Publishing/deploying is a separate task: documentation updates do not create a repository, configure a remote, or deploy the demo. Before calling the release open source, choose and add its distribution license. Keep public fixtures synthetic; do not commit real resumes, provider keys, or personal databases.

## Local version control

This project uses local Git tracking. Review and commit a change with:

```sh
git status
git diff
git add <changed-files>
git commit -m "Describe the product change"
```

Credentials, personal runtime data, dependencies, and generated output are excluded through `.gitignore`. The mock's browser-stored state is separate from the tracked source files.
