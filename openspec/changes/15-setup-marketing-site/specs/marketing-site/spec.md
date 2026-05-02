# marketing-site — Spec Delta

## ADDED Requirements

### Requirement: The marketing site SHALL ship as a Docker image served by nginx

#### Scenario: image structure
- **GIVEN** the `marketing/Dockerfile`
- **WHEN** the image is built
- **THEN** the resulting image is based on `nginx:alpine`
- **AND** `/usr/share/nginx/html` contains the contents of `marketing/public/`
- **AND** the image listens on port 80

### Requirement: The site SHALL serve English and Arabic homepages with a visible switcher

#### Scenario: visit root
- **WHEN** a user GETs `/`
- **THEN** the response is the English homepage (`<html lang="en">`)
- **AND** a visible language switcher offers a link to `/ar/`

#### Scenario: visit Arabic
- **WHEN** a user GETs `/ar/`
- **THEN** the response is the Arabic homepage with `<html dir="rtl" lang="ar">`
- **AND** the switcher links back to `/`

### Requirement: The site SHALL function with JavaScript disabled

#### Scenario: no-JS page load
- **GIVEN** a browser with JavaScript disabled
- **WHEN** the user opens `/` or `/ar/`
- **THEN** all content renders correctly
- **AND** the language switcher works (it's an `<a>` tag, not a click handler)

### Requirement: The site SHALL host legal pages rendered from markdown

#### Scenario: privacy page exists
- **WHEN** a user GETs `/privacy/` (English)
- **THEN** the response is HTML rendered from `docs/legal/en/privacy.md` via the legal template
- **AND** the same content exists at `/ar/privacy/` from the Arabic markdown source

### Requirement: Cache and gzip SHALL be enabled at nginx

#### Scenario: cache headers
- **GIVEN** a request for `/styles.css`
- **WHEN** the response returns
- **THEN** a `Cache-Control` header with `max-age >= 86400` is present
- **AND** the response is `Content-Encoding: gzip` (or `br` if available)

### Requirement: Lighthouse scores SHALL be ≥ 95

#### Scenario: audit
- **GIVEN** a Lighthouse run against the homepage in either locale
- **WHEN** the audit completes
- **THEN** Performance, Accessibility, Best Practices, and SEO scores are all ≥ 95

### Requirement: 404 SHALL be handled gracefully in both locales

#### Scenario: missing English page
- **WHEN** a user requests `/this-does-not-exist`
- **THEN** the response status is 404
- **AND** the body is `/404.html` with a "page not found" message and a link home

#### Scenario: missing Arabic page
- **WHEN** a user requests `/ar/this-does-not-exist`
- **THEN** the response is the Arabic 404 page (RTL)
