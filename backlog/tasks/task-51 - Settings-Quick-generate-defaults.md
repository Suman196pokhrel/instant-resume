---
id: TASK-51
title: 'Settings: Quick generate defaults'
status: In Progress
assignee: []
created_date: '2026-11-18T12:48:00Z'
updated_date: '2026-11-19T03:30:00Z'
labels: []
dependencies: []
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I set the theme, page budget, cover letter and tone that Quick generate uses. Refs: SPEC §13.3 item 2, §14.3 Settings used. Split from TASK-26.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Settings has Default theme (Classic, Modern, Compact), Page budget (1 or 2 pages), Cover letter switch and tone (disabled when off), saved immediately with the toast 'Preference saved'
- [ ] #2 Quick generate applies the theme preset, the page budget, the cover letter switch and the tone
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach:
- New client section components/settings/Prefs.tsx (PrefsSettings): holds the prefs read on the server, renders 'Quick generate defaults' (mock quickSettingsHtml): Default theme NativeSelect, Page budget Segmented, Cover letter Switch (On/Off), tone NativeSelect disabled when off. Each change PUTs the whole prefs to /api/settings, then toast 'Preference saved'; on failure toast the error and roll back. TASK-38 adds its Preferences section to the same component (shared state, so the full-object PUT never clobbers).
- Settings page reads prefs (readPrefs) and renders PrefsSettings after Connections; dynamic render.
- generateDocuments takes optional theme (default THEME_DEFAULTS) for the skeleton; pipeline passes THEME_PRESETS[prefs.quick.theme], so both docs carry the preset. Pages/cover letter/tone already flow from prefs.

Files: components/settings/Prefs.tsx (new), app/(shell)/settings/page.tsx, lib/generate/generate.ts, lib/generate/pipeline.ts, tests/unit/pipeline.test.ts, tests/e2e/settings.spec.ts, SPEC (no behaviour change beyond spec; check mock matches).

Tests:
- unit: prefs theme 'modern' → both saved docs have the modern font and accent (AC2)
- unit: tone from prefs reaches the generate prompt (AC2)
- e2e: change theme, page budget, cover letter → toast 'Preference saved' each; reload keeps them; tone disabled when cover letter off (AC1)
- e2e: /new/quick notes line reflects the saved defaults (AC2)

Out of scope: paper size and spelling (TASK-38), Studio using the preset.
<!-- SECTION:PLAN:END -->
