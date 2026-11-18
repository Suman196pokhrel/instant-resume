---
id: TASK-16
title: Rewrite a section with an instruction
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T10:23:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can ask for one section to be rewritten and review the change before accepting it. Refs: SPEC §8.3, US7, §18.4 #7.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An instruction sends only the selected section and gets back JSON Patch operations for that section
- [x] #2 The proposal shows a word diff, tagged when content comes from the knowledge base
- [x] #3 Accept applies it and Reject leaves the section untouched; both work for cover letter paragraphs
- [x] #4 A no-change result shows the §8 message with a different example instruction
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- lib/generate/rewrite.ts: rewriteSection(input, adapter, signal) sends one section (with its index, as path lines like generate's outline), the instruction, brief, notes, tone, spelling and KB entries (with highlight IDs); returns { ops, note } (note is a required string, "" = none, for strict output). validatePatch with rewriteRules(i); retry once, then outputError. Returns { section, ops, note } or { section: null } when the validated result deep-equals the original.
- Grounding: item sections send the entries their items ref; summary and paragraphs send the entries the resume references (else they have no facts). Token note N = (system + prompt chars) / 4, built on the device.
- Store keeps the proposal out of docs: pending { sectionId, kind, before, after, instruction, ops, warnings }. Preview overlays pending.after. Accept clears that doc's timer, writes the section and saves now as { kind: "rewrite", label: 'Rewrote {title}: "{instruction}"' } (no coalesceKey). Reject drops pending.
- Busy or pending disables Edit by hand; select, kind change or unmount aborts the call and drops pending.

Decisions
- Empty bullet text (card comment): the validator rejects any blank replace/add value, in every call; the prompt says use remove. Generation's blank-skeleton retry still applies.
- A non-skills line (education notes, credentials) can't change: frame() already rejects it; add a unit case.
- Warning: an "emphasise X" instruction where X isn't in the KB text (kwMatch) shows "{X} isn't in your knowledge base. If you accept, checks will flag it as an unsupported claim."

Files
- lib/generate/rewrite.ts (new); lib/doc/diff.ts (new: wordDiff, sectionDiff with tags "from knowledge base", "moved up", "removed"); lib/patch/validate.ts (blank values)
- lib/llm/mock.ts: rewrite fixture. "emphasise X": add the first unused highlight matching X at bullets/0 of an item that owns it (seed: hl-bw-5 Mentoring), or move matching bullets up; paragraphs get a replace. "concise": drop the last sentence of the text or each bullet's trailing clause. Anything else: [] (no change)
- lib/stores/workspace.ts: pending, propose, accept, reject; save(kind, revision)
- components/workspace/Instruction.tsx (new): label, composer (textarea + "Sends only this section, about N tokens" + Rewrite, tooltip Ctrl+Enter), chips by kind ({kw} = first missing keyword in the KB, else the first brief keyword), busy strip "Rewriting with {model}", field error; Proposal card (head, diff, warning callouts, Accept/Reject pair, Collapsible "{n} patch operations, validated" with JSON)
- ContentInspector.tsx (mount it, disable hand edits), Preview.tsx (overlay), app/globals.css (sweep keyframe + animate-sweep, reduced-motion safe; diff colours from danger-soft/danger, accent-soft/accent-ink)
- docs/SPEC.md §8.1 (rewrite fixture), §8.3 (grounding, token note, blank values), §14.5 (hand edits disabled while pending); mock/js/views-workspace.js to match

Tests
- unit rewrite: the prompt carries only section i; an op on another section is rejected, retried, then output error; an added bullet with another entry's source is rejected; a same-value replace gives no change; text sections get the resume's entries
- unit validate: blank bullet text replace rejected; education line change rejected
- unit diff: merged ins/del runs; new bullet tagged from knowledge base, moved up, removed
- e2e AC1+2: Experience, chip "Emphasise Mentoring": proposal with an ins diff and a "from knowledge base" tag, "n patch operations, validated" opens; focus goes to "Proposed change"
- e2e AC3: Accept: the inspector text changes, the PUT carries kind rewrite and the label, toast "Change applied to Experience"; Reject: unchanged, toast "Change rejected. Nothing was applied.", no PUT; a cover letter paragraph "More concise" Accept changes it; focus returns to the instruction box
- e2e AC4: "make it sparkle" → 'No change suggested for "make it sparkle". Try a different instruction, like "emphasise React".'; "emphasise React" (no change) → suggests "lead with metrics" (unit)
- e2e: empty instruction → "Type an instruction first, or pick one of the suggestions."; Ctrl+Enter submits; busy disables inputs and the status names the model
- opt-in tests/unit/rewrite-live.test.ts (IR_LIVE=1): one rewrite on Sonnet 5.5 validates

Out of scope
- Undo on the Accept toast (TASK-19; shortcut comment), Proposed/shimmer/flash styling in the preview (TASK-46), Emphasise from Checks (TASK-21), cancel button
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Rewrite one section: lib/generate/rewrite.ts (validated with rewriteRules, retry once, no-change detection, live-proven on Sonnet 5.5), word diff, Instruction box + Proposal card, Accept saves a rewrite revision, Reject saves nothing.
Deferred: Accept toast Undo (TASK-19), preview Proposed/shimmer/flash (TASK-46); e2e can't assert the model name in the busy strip (no connection in e2e).
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T08:44:00Z

---

From TASK-13 review: rewriteRules(i) and validatePatch exist in lib/patch/validate.ts. A rewrite 'replace' of a bullet's text with an empty string is accepted today; decide whether that should be rejected (or treated as remove) when building rewrite.

---

created: 2026-11-18T10:19:00Z

---

Build done: lib/generate/rewrite.ts (+ mock fixture, opt-in live check: Sonnet 5.5 3-4 s, ~3,200 in / 200-320 out, validated first time), lib/doc/diff.ts, store pending/busy/accept/reject with ordered saves, components/workspace/Instruction.tsx. Token note recalibrated to 380 + chars/2 from live runs. 260 unit + 90 e2e pass.

---
<!-- COMMENTS:END -->
