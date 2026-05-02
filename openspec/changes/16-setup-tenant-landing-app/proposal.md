# Setup tenant landing app (`<slug>.ma3ady.com`)

## Why

Per user decision, ma3ady has no web booking surface — booking happens in the mobile app. But `<slug>.ma3ady.com` URLs need to do *something* useful when shared. The tenant landing app: a single Docker image serving any `<slug>.ma3ady.com` host, looking up the tenant by `Host` header, rendering a tenant-branded page with logo + name + "Open in App" universal link. If the user doesn't have the app, they see App Store / Play Store badges.

This is also the surface that hosts the `/manage/<token>` universal link landing for users who tap a manage link in email/WhatsApp on a device where the app isn't installed — the page deep-links into the app if available, falls back to install CTA.

## What Changes

- **ADDED** `tenant-landing/` directory:
  - `Dockerfile` — `FROM denoland/deno:alpine` (or `node:alpine` if simpler), runs a tiny Hono / Astro / Deno HTTP server
  - `server.ts` — Deno server that:
    1. Parses `Host` header → `slug = host.split('.')[0]`
    2. If subdomain is `www`, `auth`, etc. (reserved) → redirect to `ma3ady.com`
    3. Else: queries Supabase for `tenants` row by slug (with anon key)
    4. If found → renders the landing page (tenant brand color, name, logo) with universal-link CTA
    5. If not found → 404 page
  - `public/` — static assets (logo, fonts, base CSS)
  - `templates/{tenant.html, manage.html, 404.html}` — server-rendered with tenant data interpolated
  - `deployment.yaml` — version-pinned, ingress with TLS for `*.ma3ady.com`
  - `apple-app-site-association` and `assetlinks.json` — universal/deep link configs (drafted; populated when iOS/Android bundle ids and team id are finalized in change 18)
- **ADDED** `manage/<token>` route on the same server: minimal page that immediately tries to open `ma3ady://manage/<token>`, falls back to App Store / Play Store badges after 1.5s timeout
- **NOT ADDED**: any actual booking UI on the web (per requirement, mobile-only booking)

## Impact

- Affects `marketing-site` capability (delta).
- Required for tenant subdomain functionality and email/WhatsApp link handling.
- No mobile app changes.
