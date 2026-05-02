# Tasks

- [ ] 16.1 Create `tenant-landing/` directory
- [ ] 16.2 Write `tenant-landing/server.ts` — Deno HTTP server using `std/http`:
  - Listens on `0.0.0.0:8080`
  - Routes:
    - `GET /` (any host) — host parsing, tenant lookup, render
    - `GET /manage/:token` — render manage redirect page
    - `GET /apple-app-site-association` — return JSON
    - `GET /.well-known/assetlinks.json` — return JSON
    - `GET /favicon.ico` etc. — static from `public/`
  - Tenant lookup uses `@supabase/supabase-js` with `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - 60s in-memory cache for tenant lookups (LRU, max 500 entries)
- [ ] 16.3 Write `tenant-landing/templates/tenant.html` — landing template:
  - Tenant brand color in CSS variable
  - Logo (or wordmark fallback) + tenant name
  - "Open in App" button → `ma3ady://t/{slug}` (universal link target)
  - App Store + Play Store badges below
  - Locale switcher (en/ar based on tenant default + ?lang= override)
- [ ] 16.4 Write `tenant-landing/templates/manage.html`:
  - Tries `ma3ady://manage/{token}` via `<meta http-equiv="refresh">` and a JS fallback
  - After 1.5s shows install CTAs
  - Token never inspected server-side — opaque pass-through
- [ ] 16.5 Write `tenant-landing/templates/404.html` (en + ar)
- [ ] 16.6 Write `tenant-landing/Dockerfile` — `FROM denoland/deno:alpine`, copy server + templates + public, expose 8080, healthcheck on `/health`
- [ ] 16.7 Write `tenant-landing/deployment.yaml` — schema version pinned, `host: '*.ma3ady.com'`, port 8080, env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- [ ] 16.8 Write `tenant-landing/public/apple-app-site-association` (no extension, served as JSON):
  ```json
  {"applinks":{"details":[{"appIDs":["TEAMID.com.ma3ady.app"],"components":[{"/":"/manage/*"},{"/":"/t/*"}]}]}}
  ```
- [ ] 16.9 Write `tenant-landing/public/.well-known/assetlinks.json` for Android — populated in change 18 when SHA-256 fingerprint is known; placeholder file present here
- [ ] 16.10 Configure mobile app `app.json` with `associatedDomains: ["applinks:ma3ady.com", "applinks:*.ma3ady.com"]` (declared; effective only in dev client / prod build)
- [ ] 16.11 Tests:
  - Unknown subdomain renders 404
  - Reserved subdomain (`www`, `app`) redirects to apex
  - Known tenant renders with brand color
  - Manage page renders with token in href
  - Tenant lookup is cached (second request hits cache, observable via metric)
- [ ] 16.12 Local Docker test: `docker run -p 8080:8080 -e SUPABASE_URL=... ...`, verify `curl -H 'Host: demo.ma3ady.com' localhost:8080` returns the demo tenant page
