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

### Requirement: The marketing site SHALL never expose write surfaces

Only `GET` and `HEAD` SHALL be accepted by the marketing service; any `POST`/`PUT`/`PATCH`/`DELETE` MUST return HTTP 405 and MUST NOT trigger any Supabase write. (The tenant booking surface and the manage flow live on `app.ma3ady.com` and are out of this capability's scope.)

#### Scenario: only GET allowed
- **WHEN** a `POST`, `PUT`, `PATCH`, or `DELETE` is sent to any path on `ma3ady.com`
- **THEN** the server returns HTTP 405 Method Not Allowed
- **AND** no Supabase write is performed

