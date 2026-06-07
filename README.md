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
