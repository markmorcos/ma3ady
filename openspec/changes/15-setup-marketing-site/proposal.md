# Setup marketing site

## Why

`ma3ady.com` needs a public landing page. Mirror stminaconnect's approach exactly: plain HTML + CSS, served by `nginx:alpine` in Docker, deployed via the infrastructure repo. No JS framework. Cheap, fast, easy to translate, easy to deploy.

The site links into the mobile app via App Store / Play Store badges (badges grayed out / "Coming soon" until store listings exist) and via universal-link CTAs that open the app for booking.

## What Changes

- **ADDED** `marketing/` directory:
  - `Dockerfile` — `FROM nginx:alpine`, copies `public/` to `/usr/share/nginx/html`
  - `nginx.conf` — gzip, cache headers for static assets, redirect `www.` → apex
  - `deno.jsonc` — single task: `render-legal` (renders `docs/legal/*.md` to `public/{en,ar}/{privacy,terms}/index.html`)
  - `scripts/render-legal.ts` — `marked`-based renderer, mirrors stminaconnect
  - `templates/legal.html` — shared HTML shell for legal pages
  - `deployment.yaml` — version-pinned, mirrors stminaconnect's schema
  - `public/`:
    - `index.html` — English homepage (root + `/en/`)
    - `ar/index.html` — Arabic homepage (RTL via `dir="rtl"`)
    - `404.html`
    - `styles.css` — variables, sections, RTL overrides
    - `favicon.ico`, `favicon.png`, `apple-touch-icon.png`, `og-image.png`, `icon.png`
    - `robots.txt`, `sitemap.xml`
    - `assets/` for screenshots when ready
- **ADDED** homepage section structure:
  - `<header class="hero">` — language switcher (EN | AR), wordmark, tagline, App Store / Play Store badges (placeholder), primary CTA "Try the demo"
  - `<section class="for-whom">` — tile grid: Clinics, Salons, Tutors, Coaches (with icon + 1-line desc each)
  - `<section class="features">` — 3 feature articles: "Booking, simplified" | "Built bilingual (EN+AR)" | "Honest pricing — free during beta"
  - `<section class="screenshots">` — 3 figure placeholders (admin Today, public booking, manage from email)
  - `<footer>` — links to /privacy, /terms, support email, social placeholders
- **ADDED** legal sources `docs/legal/{en,ar}/{privacy,terms}.md` — initial drafts
- **ADDED** sitemap + robots
- **NOT ADDED** in this change: per-tenant subdomain landing app (that's change 16) — though they share infra patterns

## Impact

- Affects `marketing-site` capability (initial spec).
- Required by the deployment pipelines change (17).
- No app behavior; informational only.
