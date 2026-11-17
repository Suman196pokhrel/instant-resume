---
id: TASK-6
title: Knowledge base screen
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T10:53:00Z'
labels:
  - m3
dependencies:
  - TASK-32
  - TASK-33
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can browse and edit every entry in my knowledge base by section, so it stays accurate. Refs: SPEC §1.4, §13.2, §6.1. Mock: views-app.js KB_SCHEMA and KB_ORDER.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 /kb/[section] lists the entries for each KB section in KB_ORDER
- [x] #2 Adding, editing and deleting an entry or highlight saves it and survives a reload
- [x] #3 Inline validation shows field errors and moves focus to the first one
- [x] #4 Volunteer work and additional sections are supported, and no paid role is required
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- Port the mock's KB_SCHEMA, KB_ORDER and kbEntrySummary to one shared module, lib/schemas/kb-fields.ts (TASK-7 reuses it). It holds labels, placeholders, req, type, options, wide and list, plus a pure validateFields(section, values) that returns { field: message } using the mock's copy ("Enter your job title", "Enter an email like name@example.com"). Rules follow Zod/SPEC §6.1, not the mock: contact location is required, volunteering start/end are optional, additional notes is required (stricter than Zod, as the mock has it).
- /kb/[section] is a server component: it calls readKb(await getDb()) directly and redirects to /onboarding when there is no KB. It renders a client KbScreen: a sub-nav with counts in KB_ORDER, the section head with "Add {noun}", entry cards, and the Edit/Add dialog. Saves call the existing routes (PUT contact/work-rights, POST/PATCH/DELETE /api/kb/:type), then router.refresh(), then lib/toast: "Saved to knowledge base" or "Entry deleted". A 422 maps issues onto fields.
- Highlights editor: rows keep the highlight's id, skills and evidenceFor; new rows are sent without an id (the server fills it); empty rows are dropped. PATCH replaces the whole highlights array, so nothing may be lost.
- On Save, invalid fields get aria-invalid, aria-describedby and the error text, and focus moves to the first one.

Files to touch
- lib/schemas/kb-fields.ts (new); app/(shell)/kb/[section]/page.tsx (drop the SECTIONS shortcut); components/kb/KbScreen.tsx, EntryDialog.tsx, HighlightsEditor.tsx (new)
- components/ui: input.tsx, textarea.tsx, native-select.tsx (styled native <select>), field.tsx (label, "optional", error), chip.tsx, pill.tsx, empty-state.tsx (new, mock styles.css, tokens only); add each to /dev/ui (components/dev/Gallery)
- lib/db/client.ts: openDb() reads IR_DB_URL when set; playwright.config.ts: webServer sets IR_DB_URL=file:<os tmp>/ir-e2e.db and runs `pnpm db:seed --force && pnpm build && pnpm start`; SPEC §3/§18.4 and AGENTS.md note the variable
- docs/SPEC.md §13.2: note the no-KB redirect and the corrected required fields

Data/API: no route changes. IR_DB_URL is test-only plumbing, so e2e never touches ./data.

Tests
- unit tests/unit/kb-fields.test.ts: KB_ORDER matches SPEC §13 slugs; required and email messages; a volunteer role without dates passes; skills list splits on commas; the summary of a volunteer role without location has no stray comma; every req field agrees with the Zod schema (parse the minimal valid entry built from req fields)
- e2e tests/e2e/kb.spec.ts (serial, seeded Jordan Whitlock KB):
  - AC1: the nav lists the sections in KB_ORDER with counts; each slug renders its title; an unknown slug 404s
  - AC2: add a role with 2 highlights, then reload and see it. Edit a seeded role's title and one highlight's text, reload, then GET /api/kb: every highlight id and its skills are unchanged. Remove a highlight; delete the entry; both survive a reload
  - AC3: Save on an empty Add role form shows the errors and focuses Job title; a bad contact email shows the email message
  - AC4: a volunteer role saves with no dates; an additional section saves; a section emptied by deleting shows "No {section} yet"
  - DoD: Edit opens by keyboard, Escape closes it and focus returns to Edit; mobile width turns the nav into a horizontal row
- existing e2e specs still pass against the seeded test DB

Out of scope
- Import backup and Export backup actions (TASK-27; add a note there). "Import resume" only links to /import.
- Orphaned bullet references after a highlight is deleted (claims check, TASK-20); reordering entries; showing referenceOnly additional sections differently
- Component-test infrastructure (Testing Library isn't installed; §18.2 doesn't list the KB)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
KB screen at /kb/[section]: section nav, entry cards, add/edit/delete dialogs with a highlights editor that keeps highlight IDs, skills and evidenceFor; shared field schema in lib/schemas/kb-fields.ts for TASK-7; new form, pill, chip and empty-state components; e2e runs on a seeded throwaway DB (IR_DB_URL).
Review: 107 unit + 45 e2e green; contact, empty, skills, error and dialog states match the mock; fixed in review: network failure left Save stuck, misleading failure toast, duplicate chip keys. Parked: Undo for KB deletes.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:44:00Z

---

Build done. Unit 107/107 (incl. kb-fields, kb-page redirect); e2e 42/43: the one failure is startup.spec 'pnpm dev refuses a non-loopback HOST', because the owner's own next dev was running (Next allows one dev server per project), unrelated. Visual check against mock #/kb/roles and the Edit role dialog: matches; backup buttons and model picker arrive with TASK-27/TASK-10. Mutation check: dropping the preserved highlight fields fails the AC2 e2e. Mock fix: contact location required, volunteer dates optional (SPEC §6.1).

---

created: 2026-11-17T10:48:00Z

---

Correction to the previous note: the startup.spec failure came from a stray next dev process that has since exited; full e2e now 44/44 green, unit 107/107. Also fixed: /kb redirects to /kb/roles, focus moves to Add {noun} after a delete, mock kbEntrySummary no longer shows ' to ' or a trailing comma for missing optional fields. Four stale next-server processes from Nov 16 still listen on 127.0.0.1:3110-3113 (not touched). Open: SPEC §3 says the DB is accessed only from route handlers; the KB page reads it in a server component (asked the owner). Review should visually compare the contact card, an empty section, the error state and skill chips.

---
<!-- COMMENTS:END -->
