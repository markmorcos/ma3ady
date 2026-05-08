# marketing-site Specification

## Purpose
TBD - created by archiving change setup-marketing-site. Update Purpose after archive.
## Requirements
### Requirement: The marketing site SHALL ship as a Docker image served by nginx

`marketing/Dockerfile` SHALL be based on `nginx:alpine`, copy `marketing/public/` into `/usr/share/nginx/html`, and the resulting image MUST listen on port 80 so the infrastructure ingress can route to it unchanged.

#### Scenario: image structure
- **GIVEN** the `marketing/Dockerfile`
- **WHEN** the image is built
- **THEN** the resulting image is based on `nginx:alpine`
- **AND** `/usr/share/nginx/html` contains the contents of `marketing/public/`
- **AND** the image listens on port 80

### Requirement: The site SHALL serve English and Arabic homepages with a visible switcher

`/` SHALL respond with the English homepage (`<html lang="en">`) and `/ar/` with the Arabic homepage (`<html dir="rtl" lang="ar">`); both pages MUST render a visible language switcher linking back and forth.

#### Scenario: visit root
- **WHEN** a user GETs `/`
- **THEN** the response is the English homepage (`<html lang="en">`)
- **AND** a visible language switcher offers a link to `/ar/`

#### Scenario: visit Arabic
- **WHEN** a user GETs `/ar/`
- **THEN** the response is the Arabic homepage with `<html dir="rtl" lang="ar">`
- **AND** the switcher links back to `/`

### Requirement: The site SHALL function with JavaScript disabled

The marketing site SHALL be static HTML with no client-side JavaScript dependency, so the language switcher MUST be a plain `<a>` tag and content MUST render fully with JS disabled.

#### Scenario: no-JS page load
- **GIVEN** a browser with JavaScript disabled
- **WHEN** the user opens `/` or `/ar/`
- **THEN** all content renders correctly
- **AND** the language switcher works (it's an `<a>` tag, not a click handler)

### Requirement: The site SHALL host legal pages rendered from markdown

The build SHALL render `/privacy/` and `/terms/` HTML for both locales from the markdown sources under `docs/legal/<locale>/`, and the generated pages MUST be reachable at the canonical URLs the mobile app links to.

#### Scenario: privacy page exists
- **WHEN** a user GETs `/privacy/` (English)
- **THEN** the response is HTML rendered from `docs/legal/en/privacy.md` via the legal template
- **AND** the same content exists at `/ar/privacy/` from the Arabic markdown source

### Requirement: Cache and gzip SHALL be enabled at nginx

The nginx config SHALL set `Cache-Control: max-age >= 86400` on static assets and MUST enable gzip (or brotli) compression on the response so Lighthouse scores stay healthy.

#### Scenario: cache headers
- **GIVEN** a request for `/styles.css`
- **WHEN** the response returns
- **THEN** a `Cache-Control` header with `max-age >= 86400` is present
- **AND** the response is `Content-Encoding: gzip` (or `br` if available)

### Requirement: Lighthouse scores SHALL be ≥ 95

A Lighthouse run against the homepage in either locale SHALL score ≥ 95 on Performance, Accessibility, Best Practices, and SEO; the CI Lighthouse step MUST fail the PR if any score drops below the threshold.

#### Scenario: audit
- **GIVEN** a Lighthouse run against the homepage in either locale
- **WHEN** the audit completes
- **THEN** Performance, Accessibility, Best Practices, and SEO scores are all ≥ 95

### Requirement: 404 SHALL be handled gracefully in both locales

The nginx config SHALL serve `/404.html` for missing English paths and the Arabic 404 page (RTL) for paths under `/ar/`, and both responses MUST link the user back home.

#### Scenario: missing English page
- **WHEN** a user requests `/this-does-not-exist`
- **THEN** the response status is 404
- **AND** the body is `/404.html` with a "page not found" message and a link home

#### Scenario: missing Arabic page
- **WHEN** a user requests `/ar/this-does-not-exist`
- **THEN** the response is the Arabic 404 page (RTL)

### Requirement: A single tenant-landing service SHALL serve all `*.ma3ady.com` subdomains

The tenant-landing image SHALL resolve the tenant by `Host` header against `tenants.slug`, render the tenant's name and `brand_color` with an "Open in App" CTA targeting `ma3ady://t/<slug>`; unknown slugs MUST return 404 and reserved subdomains (e.g. `www`) MUST 301-redirect to `https://ma3ady.com`.

#### Scenario: known tenant
- **GIVEN** a tenant with slug `acme` exists
- **WHEN** a request arrives with `Host: acme.ma3ady.com`
- **THEN** the server returns 200
- **AND** the rendered HTML contains the tenant's name and brand color
- **AND** the page includes an "Open in App" CTA targeting `ma3ady://t/acme`

#### Scenario: unknown tenant
- **WHEN** a request arrives with `Host: ghost.ma3ady.com` and no such tenant exists
- **THEN** the server returns 404
- **AND** the body is the friendly 404 page in the requested locale

#### Scenario: reserved subdomain
- **WHEN** a request arrives with `Host: www.ma3ady.com`
- **THEN** the server responds with a 301 redirect to `https://ma3ady.com`

### Requirement: Tenant lookups SHALL be cached in-memory with a 60s TTL

The server SHALL cache tenant rows in process memory keyed on slug for 60 seconds — cache hits MUST set `X-Cache: HIT` and avoid the Supabase round-trip, and entries MUST be re-fetched on expiry.

#### Scenario: cache hit
- **GIVEN** a tenant has just been requested
- **WHEN** a second request for the same tenant arrives within 60s
- **THEN** the server serves the response without a Supabase round-trip
- **AND** the `X-Cache: HIT` response header is set

#### Scenario: cache expiry
- **WHEN** a request for the same tenant arrives more than 60s after the prior fetch
- **THEN** the cache is bypassed, Supabase is queried, and the new value is cached

### Requirement: The `/manage/:token` route SHALL bounce to the deep link with a fallback

`/manage/:token` SHALL be served such that universal-link resolution opens `ma3ady://manage/<token>` directly when the app is installed; when not, the rendered page MUST attempt a meta-refresh to the deep link and after 1.5s reveal App Store / Play Store badges with the token preserved.

#### Scenario: app installed
- **GIVEN** a user taps a manage link from email
- **WHEN** the browser loads `https://acme.ma3ady.com/manage/<token>` (or `https://ma3ady.com/manage/<token>`)
- **THEN** universal-link resolution opens the app at `ma3ady://manage/<token>` directly (iOS/Android handle this, page is never rendered)

#### Scenario: app not installed
- **GIVEN** the same flow but no app is registered
- **WHEN** the page renders
- **THEN** a meta-refresh attempts `ma3ady://manage/<token>`
- **AND** after 1.5 seconds, App Store and Play Store badges become visible
- **AND** the token is preserved in the deep-link target across the redirect attempt

### Requirement: Universal-link configuration SHALL be served at the well-known paths

The server SHALL serve a valid `apple-app-site-association` (declaring `applinks` for `/manage/*` and `/t/*`) and `.well-known/assetlinks.json` (declaring the bundle id and SHA-256 cert fingerprint), each MUST respond with `Content-Type: application/json`.

#### Scenario: iOS resolution
- **GIVEN** an iOS device verifying associated domains
- **WHEN** it requests `https://ma3ady.com/apple-app-site-association`
- **THEN** the server returns a valid JSON document
- **AND** `Content-Type: application/json`
- **AND** the document declares the `applinks` for `/manage/*` and `/t/*` patterns

#### Scenario: Android resolution
- **GIVEN** an Android device verifying app links
- **WHEN** it requests `https://ma3ady.com/.well-known/assetlinks.json`
- **THEN** the server returns valid JSON declaring the bundle id and SHA-256 cert fingerprint
- **AND** `Content-Type: application/json`

### Requirement: The tenant landing SHALL never expose write surfaces

Only `GET` and `HEAD` SHALL be accepted by the tenant-landing service; any `POST`/`PUT`/`PATCH`/`DELETE` MUST return HTTP 405 and MUST NOT trigger any Supabase write.

#### Scenario: only GET allowed
- **WHEN** a `POST`, `PUT`, `PATCH`, or `DELETE` is sent to any path
- **THEN** the server returns HTTP 405 Method Not Allowed
- **AND** no Supabase write is performed

