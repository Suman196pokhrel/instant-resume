# Demo hosting and feedback collector

This folder deploys the clickable mock to Cloudflare as one Worker (ported from the Sambad demo):

- **The demo.** Cloudflare serves the files in `mock/` (`index.html`, `js/`, `styles.css`, `config.js`) as a
  static site. `mock/.assetsignore` keeps this folder out. Those requests are free and never run this code.
- **Feedback.** Requests to `/feedback` run `src/index.js`, which checks each entry and stores it in the
  D1 database `instant-resume-feedback` on the owner's account. Nobody else can read it.

Live: https://instant-resume-demo.spokhrel196.workers.dev

## How feedback moves

1. A visitor uses **Give feedback** in the demo strip. They can score usefulness 1–5, pick topics, write a
   note, point at any element on screen, and optionally give a role and an email. The entry is saved on
   their device first (`localStorage`, key `instant-resume-feedback-v1`, which "Reset all demo data" keeps).
2. When the page is served from a website and online, queued entries are sent in batches of up to 10,
   with a Turnstile token proving a person is at the page.
3. The Worker checks everything again and stores what passes. Accepted or rejected entries leave the
   queue; rate-limited or failed sends stay queued and retry (every minute, and when the browser comes online).
4. Opened from disk (`file://`), nothing is sent. Export it from **Demo controls → Feedback on this device**.

## Spam protection

| Layer | Where | What it stops |
|---|---|---|
| Hidden trap field, minimum time to fill | Page and Worker | Form-filling bots |
| Length limits | Page and Worker | Oversized pastes |
| Same note twice from one browser is dropped; long notes also when repeated from one IP | Page and Worker | Copy-paste floods |
| 10 second cooldown, 40 entries per browser per day | Page and Worker | Mashing Send |
| Cloudflare Turnstile token, verified server side, only for this hostname | Worker | Scripts posting directly |
| 60 entries per IP per 10 minutes, 600 per IP per day | Worker | Anyone past Turnstile |
| Origin allowlist | Worker | Other websites posting from a visitor's browser |

Page-side checks are for honest visitors; only the Worker's checks are trusted. Raw IP addresses are
never stored, only a salted SHA-256 hash.

## Setup (done once; repeat only for a fresh account)

```bash
cd mock/feedback-worker
npx wrangler login
npx wrangler d1 create instant-resume-feedback        # database_id goes in wrangler.toml
npx wrangler d1 execute instant-resume-feedback --remote --file=schema.sql
npx wrangler deploy
openssl rand -hex 32 | npx wrangler secret put IP_SALT
(umask 077; openssl rand -hex 32 > ~/.instant-resume-feedback-token)
npx wrangler secret put ADMIN_TOKEN < ~/.instant-resume-feedback-token
```

**Turnstile (dashboard):** Turnstile → Add widget, Managed mode, hostname exactly
`instant-resume-demo.spokhrel196.workers.dev` (not `workers.dev`). Put the public **site key** in
`../config.js` as `turnstileSiteKey` and redeploy; set the **secret key** with
`npx wrangler secret put TURNSTILE_SECRET`. Until both are set, `/feedback` answers
`turnstile_not_configured` and entries stay queued in visitors' browsers, so nothing is lost.

Redeploy after any change to the mock: `npx wrangler deploy` from this folder.

## Read the feedback

```bash
curl -H "Authorization: Bearer $(cat ~/.instant-resume-feedback-token)" "https://instant-resume-demo.spokhrel196.workers.dev/feedback?format=csv" > feedback.csv
npx wrangler d1 execute instant-resume-feedback --remote --command "SELECT received_at, rating, topics, message, screen, target FROM feedback ORDER BY received_at DESC LIMIT 50"
```

Or in the dashboard: Storage & Databases → D1 → `instant-resume-feedback`.

## Test

- `node test.mjs` runs the real handler against in-memory SQLite: origin, Turnstile, validation, bot
  traps, duplicates, rate limits and the admin read-back.
- End to end locally: put `ALLOW_NO_TURNSTILE=true` in a `.dev.vars` file here (gitignored, never in
  production), run `npx wrangler d1 execute instant-resume-feedback --local --file=schema.sql` once, then
  `npx wrangler dev` and open http://127.0.0.1:8787.
