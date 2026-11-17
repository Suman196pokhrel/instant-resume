---
id: TASK-9
title: Provider connections and encrypted key storage
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T11:31:00Z'
labels:
  - m4
dependencies:
  - TASK-32
  - TASK-33
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can connect my OpenAI, Anthropic or Gemini key, checked before saving and stored encrypted only in my browser. Refs: SPEC §8.1, §8.2, §13.3, US2, §18.1 Crypto and Key validation, §18.4 #2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Settings shows a connection card for each of the 3 providers
- [x] #2 A wrong-prefix key shows its error before any request (an sk-ant- key is rejected as an OpenAI key)
- [x] #3 A test call runs before saving; a rejected key shows a clear error
- [x] #4 The saved key is AES-GCM encrypted with a non-extractable IndexedDB key, shown masked, and never reaches the server or a backup
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach (SPEC §8.1, §8.2, §13.3 Connections; mock Views.settings card())
- lib/llm/providers.ts: the provider config (id, name, prefix, keyUrl, models: the mock's lists for now; TASK-10 verifies the IDs against each provider's models endpoint), keyFormatError(provider, key) (empty, wrong prefix with the right article, sk-ant- rejected for OpenAI, too short), maskKey, and testKey(provider, key). The test call is GET on each provider's models endpoint: it costs no tokens, needs no model ID, and all three allow it from the browser (checked: CORS preflights return 200 for x-api-key + anthropic-dangerous-direct-browser-access, Authorization, and x-goog-api-key). Rejection: Anthropic 401 authentication_error, OpenAI 401 invalid_api_key, Gemini 400 API_KEY_INVALID (not 401), shown as "{Provider} rejected this key ({status} {code}). Check the key is active and copied in full."; other failures give a "couldn't reach" message.
- lib/keystore.ts (browser only): IndexedDB "instant-resume-keystore" holds one non-extractable AES-GCM 256 CryptoKey and one record per provider { provider, iv, ciphertext, masked, model, addedAt } (random 12-byte IV). listConnections() returns everything but the ciphertext; readKey(provider) decrypts only when called (for TASK-10). The active model { provider, model } lives in localStorage (activeModelSchema); the first connection becomes active.
- Settings page: the head ("Settings" / "Connections, preferences and your data."), then the Connections section: copy, the "How to get an API key" disclosure (links open in a new tab, the billing footnote), and a card per provider. Not connected: API key (password, Show/Hide), Model select, "Test and save" ("Testing key…" spinner), errors and "Key works. Saved and encrypted on this device." Connected: provider dot, "In use" pill, masked key with "Encrypted on this device", default model select, "Use {provider}", "Remove key". Toasts: "{Provider} connected", "Now using {model}", "{Provider} key removed". Provider dot colours become tokens.
- The other Settings sections arrive with their own cards (Quick generate defaults TASK-26, backup TASK-27, Access TASK-28; Preferences gets a new card).

Files: lib/llm/providers.ts, lib/keystore.ts, components/settings/Connections.tsx, app/(shell)/settings/page.tsx, app/globals.css (provider tokens), tests/unit/providers.test.ts, tests/unit/keystore.test.ts, tests/e2e/settings.spec.ts, SPEC §8.2 (models endpoint as the test call, Gemini 400)

Tests
- unit: format errors in order with the mock copy ("an Anthropic", "an OpenAI", "a Gemini"); an sk-ant- key is rejected as OpenAI; maskKey "sk-ant-…a9F2"; testKey with a fake fetch: OK, Anthropic 401, Gemini 400 API_KEY_INVALID, network failure, and the headers sent (Anthropic browser-access header, Gemini key in a header not the URL)
- unit: encrypt/decrypt round trip with a non-extractable key; the ciphertext doesn't contain the key
- e2e (provider endpoints stubbed with page.route): three cards (AC1); a wrong-prefix key shows its error and makes no request (AC2); a rejected key shows the 401 message and saves nothing (AC3); success shows the masked key and "Encrypted on this device", survives a reload, IndexedDB holds no plaintext, the CryptoKey is non-extractable, and no request to the app's own server carries the key (AC4); Use and Remove update the active model and toast
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Settings → Connections: a card per provider; format checks before any request; test call = GET the provider's models endpoint from the browser (CORS verified for all three; Gemini rejects with 400 API_KEY_INVALID); keys AES-GCM encrypted with a non-extractable IndexedDB CryptoKey (lib/keystore.ts, readKey for TASK-10), shown masked; active model in localStorage. Other Settings sections: TASK-26/27/28 and new TASK-39 (preferences).
Review: 135 unit + 60 e2e green; matches the mock. Fixed in review: the shown key could be sent to a cloud spellchecker (spellcheck off). Model IDs are the mock's fixtures until TASK-10 verifies them. Reviewed in the same session that built it.
<!-- SECTION:NOTES:END -->
