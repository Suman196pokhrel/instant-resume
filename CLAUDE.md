# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is right now

Resume Tailor: an open-source, locally hosted, bring-your-own-key (BYOK) tool. It turns a pasted job description plus a stored knowledge base (KB) into a tailored resume and cover letter. **The real application has not been written yet.** The repo holds product docs, a static interactive mock (`mock/`), and one script that renders a PDF. There is no package.json, no build, no lint, and no tests yet.

## Commands

```sh
xdg-open mock/index.html            # run the mock: no server or build, works over file://
python scripts/render_overview.py   # regenerate docs/Resume Tailor MVP Overview.pdf from docs/MVP_OVERVIEW.md (needs ReportLab 4.5.1)
```

When the real app exists, it will use pnpm with the scripts `dev`, `build`, `start`, `db:migrate`, `db:seed`, `test`, `test:e2e`, `lint` and `typecheck` (BUILD_SPEC §5). Build it in the milestone order M0–M11 from BUILD_SPEC §19.

## Document authority (read in this order)

1. `docs/CURRENT_SCOPE.md`: governs product and platform decisions.
2. `docs/BUILD_SPEC.md`: governs implementation within that scope (stack, schemas, routes, LLM contract, Typst rendering, rules engine, design tokens, flows, tests, acceptance criteria).
3. `mock/`: reference for interactions and visual details.
4. `docs/MVP_OVERVIEW.md` and its PDF: a summary only. It never overrides 1 or 2.

When product behaviour changes, update the scope doc and the matching build-spec flow **in the same commit**. If the change affects the overview, edit `MVP_OVERVIEW.md`, rerun the render script, review the pages, and commit the Markdown and PDF together. PDFs are marked binary in `.gitattributes`, so review changes in the Markdown source.

## Scope guardrails

- Only one workflow is in scope: manual entry or resume import → review the KB → new application from a pasted JD → Quick generate or Studio → edit, check, export. The main navigation has only Applications, Knowledge base and Settings.
- These features were **removed** and must not come back: job scraping and discovery, sweeps and schedulers, matches inbox, career maps and analytics, resume experiments, listing-trust checks, outreach, and application-stage tracking. The dashboard is a list of saved documents, not a CRM.
- Nothing from an import is saved before review. Unrecognised content is kept. The original resume text is reference-only and never automatically included in documents. Volunteer-only backgrounds must work.
- Keep two modes separate. The **local app** uses a real provider (called straight from the browser with the user's key, which is encrypted in IndexedDB) and SQLite behind Next.js route handlers. The **Vercel public demo** is static and serves only `mock/`. It uses simulated AI, synthetic fixtures and browser-local state, and it must not collect real keys or make live provider calls. Do not add cloud infrastructure, auth, billing or background services for the demo.
- Australian conventions by default: A4, AU spelling, a work-rights line, a referees section. Single-column templates only (for ATS safety).
- Do not invent a licence, repository URL, Vercel project or domain. Do not publish or deploy unless explicitly asked. All fixtures must be synthetic.

## Mock architecture (`mock/`)

- Plain classic `<script>` tags, not ES modules, so it works over `file://`. Load order in `index.html` matters: `data.js` → `core.js` → `docs.js` → `views-*.js` → `main.js`. Every file shares one global scope.
- `data.js`: `window.MOCK` holds the seed KB (persona "Jordan Whitlock"), sample JDs and fixtures.
- `core.js`: helpers (`$`, `$$`, `esc`, `uid`, `clone`), icons, tooltips (`Tip`, `data-tip`), toasts and modals, plus:
  - `Store`: all app state, persisted to `localStorage` under `resume-tailor-mock-v1`. Call `Store.save()` (debounced) after changes. `Store.reset()` reseeds from `seedState()`. `normalizeKnowledgeBase()` fills in missing KB arrays when loading.
  - `Router`: a hash router. `#/<name>/<params…>` is dispatched to `Views[name](root, params)`. A view may return a cleanup function, which runs on the next navigation.
- `docs.js`: `Docs` builds documents from the KB and renders them (a stand-in for Typst). It also runs the checks (rules engine) and the mock LLM.
- `views-*.js`: each file registers `Views.<route>`. Routes: `dashboard`, `kb` and `settings` (views-app), `onboarding`, `import` (`ResumeImport`), `new` (the chooser, plus `#/new/studio` for Studio setup and `#/new/quick` for the Quick generate pipeline in views-quick.js), and `project` (the Workspace editor). The KB section order and field schema are in `KB_SCHEMA` and `KB_ORDER` in views-app.js.
- PDF/DOCX import shows labelled sample extraction. TXT and pasted text go through a basic local parser. PDF export uses the browser's print dialog.
