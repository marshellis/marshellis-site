# marshellis-site

Source for the **marshellis.com** landing page — a single static `index.html`
(Tailwind via CDN, Inter font). A family-run business building small projects and fun apps.

## Deploy

Hosted on **Vercel** (free Hobby tier). It's a zero-config static site: Vercel serves
`index.html` from the repo root. Every push to `main` auto-deploys.

First-time setup (once): in the Vercel dashboard → **Add New… → Project → Import**
`marshellis/marshellis-site`, accept the defaults (no build command, output = repo root),
deploy, then add the `marshellis.com` domain under the project's **Domains** tab.

Local preview: just open `index.html` in a browser, or `npx serve .`.

## Projects linked from here

- **Daily Puzzle Games** → https://games.marshellis.com (source: `marshellis/game-generator`)

## Arcade (`/arcade/`)

- `arcade/index.html` — arcade landing page. `arcade/hex-collapse/index.html` — the Hex Collapse game (single file, Three.js from a CDN).
- `api/scores.js` — Vercel serverless function that powers the world leaderboard (no npm dependencies).
  It stores the top 200 scores in an **Upstash Redis** database via its REST API.

**One-time setup for the leaderboard:** Vercel dashboard → this project → **Storage** → **Create Database** →
choose **Upstash Redis** (free tier) → connect it to this project (all environments), then **redeploy**.
That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. Until then the game works fine and the
leaderboard just says it's unavailable.

Scores are checked server-side: each round gets a signed, single-use token, and a submitted score can't be
longer than the real time since the round started. Names are 16 characters max with a basic profanity filter.
