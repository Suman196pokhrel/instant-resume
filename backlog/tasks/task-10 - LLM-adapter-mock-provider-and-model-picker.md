---
id: TASK-10
title: LLM adapter, mock provider and model picker
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T07:28:00Z'
labels:
  - m4
dependencies:
  - TASK-32
  - TASK-33
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can pick which connected model to use from anywhere, and the app talks to it through one adapter that tests can replace. Refs: SPEC §8.1, §8.3, §17 (?mock= scenarios), §18.2 Model picker. Verify the current AI SDK structured-output API before building.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The model picker lists only connected providers' models, and switching updates the label everywhere in one click
- [x] #2 All LLM calls go through one adapter with a deterministic mock provider used by every automated test
- [x] #3 Provider responses are validated against Zod schemas; invalid output becomes a readable error, never a crash
- [x] #4 A documented, opt-in check confirms browser-direct requests (CORS) work; verified live for Anthropic, the primary provider (OpenAI and Gemini: TASK-39)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- Add ai@7.0.176 + @ai-sdk/{anthropic@4.0.106,openai@4.0.121,google@4.0.122} (all on @ai-sdk/provider 4.0.39; zod 4 is a supported peer). generateObject is @deprecated in v7, so the adapter calls generateText({ output: Output.object({ schema, name }) }) and reads result.output / result.usage. Our interface keeps SPEC's LlmAdapter.generateObject, plus one new arg `name` (the call: "brief" | "match" | ...) so the mock can pick a fixture.
- lib/llm/adapter.ts: createAdapter(model, provider, modelId) retries once on invalid output, then throws LlmError. Every failure becomes an LlmError (see Errors); abort is rethrown as is (cancel, not an error). getAdapter() = NEXT_PUBLIC_LLM_MOCK=1 ? mock : active model + readKey -> provider factory (Anthropic gets header anthropic-dangerous-direct-browser-access: true; the SDK doesn't add it).
- lib/llm/mock.ts: createMockAdapter({ fixtures, scenario, delayMs = 0 }): fixtures keyed by name get (args, scenario); output is parsed with args.schema; usage is fixed. Scenario comes from ?mock= (happy default) only in mock mode. Ships with one "ping" fixture; real fixtures land with their calls.
- Model IDs (official model pages, 2026-11-18): Anthropic claude-sonnet-5-5, claude-opus-5-5, claude-haiku-5-5; OpenAI gpt-6.2-sol, gpt-6.2-astra, gpt-6-luna; Gemini gemini-3.8-flash, gemini-3.1-pro-preview. First = default.
- Retired models, caught early: Test and save already GETs the models list; keep the IDs it returns (Anthropic ?limit=1000, Gemini ?pageSize=1000) and store `available` = configured models the key can use on the connection. The picker and Settings show only those (older connections without the field show all). A saved or active model that is no longer listed falls back to the provider's first available model. If none of the configured models is offered, saving still works and Settings says "None of our listed {Provider} models are available to this key. Update Instant Resume, or try another key."
- Model picker: components/shell/ModelPicker.tsx (client) inside TopBar, DropdownMenu + RadioGroup grouped by provider, as mock core.js modelPickerHtml: dot + "Provider model" label, "No model connected", "Add a {Provider} key" -> /settings, footer "Calls go straight from this browser to the provider.", toast "Switched to {model}". Shared state: useLlmChoice() via useSyncExternalStore (server snapshot null); keystore writes dispatch one window event; Connections.tsx reads the hook so Settings and every picker stay in sync.
- CORS check (AC4): gated /dev/llm page (devUiEnabled) runs one tiny structured call through getAdapter-style path with a pasted key and shows the result or <LlmErrorCallout>. tests/e2e/cors.spec.ts is skipped unless ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY are set; per key it runs the call in real Chromium (POST preflight + CSP) and asserts each configured model ID is in the provider's models list. Documented in AGENTS.md.

Errors (lib/llm/errors.ts, one table; LlmError { kind, title, message, detail, action? }; detail = "{status} {provider code}", never the key)
- key (401/403, authentication_error, permission_error, invalid_api_key, API_KEY_INVALID, PERMISSION_DENIED): "{Provider} didn't accept your API key" / "The key may have been revoked, expired or deleted. Add a new key in Settings to keep going." -> Open Settings
- model (404, not_found_error, model_not_found, NOT_FOUND, or a 400 whose message names the model as deprecated/unknown): "{model} isn't available any more" / "{Provider} may have retired or renamed this model, or your key can't use it. Choose another model and try again." -> Choose a model (/settings)
- quota (OpenAI insufficient_quota, Anthropic "credit balance", Gemini quota RESOURCE_EXHAUSTED): "Your {Provider} account is out of credit" / "Check your plan and billing with {Provider}, or switch to another provider." -> Open {Provider} dashboard
- rate (other 429): "{Provider} is getting too many requests" / "Wait a minute, then try again."
- busy (5xx, 529 overloaded_error): "{Provider} is having trouble right now" / "This is on {Provider}'s side. Try again in a few minutes, or switch to another model."
- network: "Couldn't reach {Provider}" / "Check your internet connection and try again."
- output (invalid twice): "The model's answer couldn't be used" / "Nothing was changed. Try again, or switch to another model if it keeps happening."
- setup (no active model or key): "No model connected" / "Add an API key in Settings to start generating." -> Open Settings
- other: "Something went wrong with {Provider}" / "Try again in a moment."
- components/llm/LlmErrorCallout.tsx: the one way screens show an LlmError (Callout, role="alert", title, message, muted detail, action link, optional Try again). Generation screens (M5+) reuse it.

Files
- new: lib/llm/{adapter,mock,errors,use-choice}.ts, components/shell/ModelPicker.tsx, components/llm/LlmErrorCallout.tsx, app/(shell)/dev/llm/page.tsx, tests/unit/{llm-adapter,llm-mock,llm-errors}.test.ts, tests/e2e/{model-picker,cors}.spec.ts
- edit: package.json, lib/llm/providers.ts (models, available IDs from the key test), lib/keystore.ts (available, change event, fallback), components/shell/TopBar.tsx, components/settings/Connections.tsx, playwright.config.ts (NEXT_PUBLIC_LLM_MOCK=1 in webServer.env; it reaches pnpm build), tests/unit/providers.test.ts, tests/unit/keystore.test.ts, tests/e2e/settings.spec.ts, mock/js/data.js (model lists), docs/SPEC.md §3, §8.1-8.3, AGENTS.md

Tests
- AC1 e2e: no key -> "No model connected" + "Add a key" links; connect Anthropic (routed key test returning only two of three models) -> picker lists those two only; pick claude-opus-5-5 -> toast, top bar label and Settings active state update without reload; keyboard opens the menu and selects.
- AC2 unit: mock returns its fixture deterministically; passes the scenario; unknown name -> LlmError; e2e build runs with NEXT_PUBLIC_LLM_MOCK=1.
- AC3 unit (ai/test mock model): valid -> object + usage; invalid then valid -> one retry; invalid twice -> output LlmError; each provider's real error bodies (fixtures) map to key / model / quota / rate / busy / network; abort rethrows; no key -> setup. e2e: /dev/llm with a routed 404 model_not_found shows the callout title, message and "Choose a model".
- Keystore/providers unit: available IDs parsed per provider; stale active model falls back; none available -> warning.
- AC4: cors.spec.ts as above (opt-in, skipped in CI).

Out of scope
- Real fixtures and the gaps / findings / error-stage-N scenarios (with the brief/match/generate cards and the pipeline, M5/M9); realistic stage delays (pipeline).
- SPEC's dev-only built-in "Mock" connection and scenario setting: NEXT_PUBLIC_LLM_MOCK + ?mock= cover it.
- Auto-switching to another model on failure (the user chooses); refreshing `available` without re-testing the key.
- Workspace bar picker (M6, reuses ModelPicker); component-test tooling, so AC1 is covered in e2e.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
One LLM adapter (AI SDK v7 generateText + Output.object, one retry), plain-English LlmError table + LlmErrorCallout, deterministic mock, model picker synced with Settings, models filtered by each key's list (snapshots count). Live-verified on Anthropic; OpenAI/Gemini in TASK-39; error-copy refinements parked in TASK-40.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T07:08:00Z

---

Built: adapter (generateText + Output.object, one retry), LlmError table + LlmErrorCallout, mock adapter (ping fixture), available models from key test with fallback, ModelPicker synced via useLlmChoice, /dev/llm probe, opt-in cors.spec.ts. 158 unit + 65 e2e pass, 3 skipped (cors, needs real keys; not yet run against real providers).

---

created: 2026-11-18T07:11:00Z

---

AC4: check built (tests/e2e/cors.spec.ts + /dev/llm) but not yet run against live providers; waiting on a run with real keys.

---

created: 2026-11-18T07:24:00Z

---

AC4 run 2026-11-18: Anthropic passes live (structured call from Chromium through CSP; all 3 model IDs listed). OpenAI and Gemini still need keys in .env.keys.

---
<!-- COMMENTS:END -->
