# marketing

Next.js 15 (App Router) workspace that serves the marketing pages for ma3ady
on `ma3ady.com` (production) and `preview.ma3ady.com` (preview). The public
booking surface and the rest of the product live on `app.ma3ady.com`
(see `web/`).

## Run locally

```bash
# from repo root
cd marketing
pnpm dev
```

Open http://localhost:3000/ for English, http://localhost:3000/ar for Arabic.
No Supabase env vars required — the marketing site is static / locale-aware
content.

## Tests

```bash
pnpm jest --selectProjects marketing
```

Covers locale resolution and en/ar parity.

## Deployment

Two manifests, dispatched by `.github/workflows/deploy-marketing.yml`:

- `deployment.preview.yaml` — `preview.ma3ady.com`, namespace `ma3ady-preview`
- `deployment.yaml`         — `ma3ady.com`,         namespace `ma3ady`

The push to `main` deploys both: preview first, then production gated by
preview success. Manual runs via `gh workflow run deploy-ma3ady-marketing.yml
-f target=preview|production|both` are also wired.

## Architecture

- `src/app/page.tsx`, `src/app/ar/page.tsx` — locale-rooted homepages
- `src/app/en/{privacy,terms}/`, `src/app/ar/{privacy,terms}/` — legal pages
- `src/app/sitemap.xml/route.ts`, `src/app/robots.txt/route.ts` — SEO bits
- `src/lib/locale.ts` — i18n primitives (en/ar) shared with the mobile app
- `src/lib/env.ts` — `APEX_HOST` only

`src/locales/{en,ar}.json` is parity-tested against itself; if the keys
diverge, the parity test fails. Keep these in sync with the mobile bundle
when the wording changes.
