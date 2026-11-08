# Resume Pipeline

Product exploration for Resume Tailor: documentation and a plain HTML, CSS, and JavaScript mock.

## Files

- [MVP overview](docs/Resume%20Tailor%20MVP%20Overview.pdf): original product brief.
- [Build specification](docs/BUILD_SPEC.md): proposed resume-tailoring MVP and its acceptance criteria.
- [Interactive mock](mock/index.html): current interaction exploration with seeded demo data.

Open the mock locally:

```sh
xdg-open mock/index.html
```

The mock supports opening directly from the filesystem. Its AI generation, job discovery, listing intelligence, and outcomes use simulated data or behavior; it is not a production service.

## Scope and documentation

The mock currently explores more than the build specification: job sweeps and matching, application stages and sent-document snapshots, listing checks, outreach drafts, career maps, and resume experiments. These explorations are not automatically approved MVP requirements. The specification still describes the narrower resume and cover-letter workflow.

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
