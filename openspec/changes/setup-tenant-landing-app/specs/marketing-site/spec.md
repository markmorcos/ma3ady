# marketing-site — Spec Delta

## ADDED Requirements

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
