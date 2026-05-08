# web-booking — Spec Delta

## ADDED Requirements

### Requirement: A customer SHALL be able to complete a booking entirely in a web browser

The `<slug>.ma3ady.com/book` page SHALL render the tenant's active services, fetch available slots via `compute_available_slots`, accept name + email + optional phone, and submit via the `book_appointment` RPC — all without requiring the customer to install the mobile app or create an account.

#### Scenario: end-to-end web booking
- **GIVEN** an anonymous visitor with a browser
- **WHEN** they navigate to `acme.ma3ady.com/book`
- **AND** select a service, pick an available slot, enter `Jane Doe / jane@example.com`, and submit
- **THEN** the booking is created via `book_appointment`
- **AND** the confirmation page shows the appointment time in tenant TZ
- **AND** a manage-token email is sent (per the notifications pipeline)
- **AND** no app install or account creation was required

#### Scenario: slot taken between fetch and submit
- **GIVEN** a visitor who selected a slot 30 seconds ago
- **WHEN** they submit and another booking has taken that slot in the meantime
- **THEN** the EXCLUDE constraint causes the RPC to raise `slot_taken`
- **AND** the page re-renders the slot picker with a banner: "That slot was just taken — please pick another."

### Requirement: First-paint SHALL be server-rendered with tenant identity

The `/book` page SHALL be server-rendered with the tenant's name, brand color, and the active services list visible in the initial HTML response, so the customer sees the tenant's identity before any JavaScript hydrates.

#### Scenario: cold load with JS disabled
- **GIVEN** a browser with JavaScript disabled
- **WHEN** the visitor loads `acme.ma3ady.com/book`
- **THEN** the tenant's name, brand color, and services list are visible in the rendered HTML
- **AND** the booking form is functional via standard HTML form submission (the slot picker requires JS but every step prior renders)

### Requirement: The web flow SHALL share the same data model and RPCs as the mobile app

The web client SHALL use only the public Supabase anon-key surface — `compute_available_slots`, `book_appointment`, `verify_manage_token`, plus direct anon-readable selects on `tenants` and `services`. No new server-side capability or RPC MUST be introduced for the web flow.

#### Scenario: shared booking creates audit + notifications
- **GIVEN** a successful web booking
- **WHEN** `book_appointment` runs server-side
- **THEN** the same `appointments` row is created
- **AND** the same `appointment_events` audit row is written
- **AND** the same `notifications` queue entries are produced
- **AND** the row is visible in the tenant's mobile admin "Today" view in real time

### Requirement: The web surface SHALL render in the customer's locale with full RTL on Arabic

Locale resolution SHALL prefer `?lang=` query param, then `Accept-Language` header, then the tenant's `default_locale`, then `en`. When the resolved locale is `ar`, the page MUST render with `<html dir="rtl">` and use logical CSS properties (`margin-inline-*`, `padding-inline-*`) so the layout mirrors correctly without conditional CSS.

#### Scenario: Arabic visitor on an English tenant
- **GIVEN** a visitor whose `Accept-Language` starts with `ar`
- **AND** the tenant's `default_locale` is `en`
- **WHEN** they load `acme.ma3ady.com/book`
- **THEN** the page renders in Arabic with `<html dir="rtl">`
- **AND** all i18n strings are sourced from the same `ar.json` the mobile app uses

#### Scenario: explicit override via query param
- **GIVEN** a visitor with `Accept-Language: ar`
- **WHEN** they navigate to `acme.ma3ady.com/book?lang=en`
- **THEN** the page renders in English with `<html dir="ltr">`

### Requirement: The web surface SHALL offer a session-only display-timezone toggle

The booking page SHALL render times in the tenant timezone by default and offer a single-tap toggle to display in the visitor's device timezone; the choice MUST persist via `sessionStorage` only and reset when the browser tab closes — never written to a cookie or persistent storage.

#### Scenario: tenant TZ default
- **GIVEN** a tenant in `Europe/Berlin` and a visitor whose device is in `America/Los_Angeles`
- **WHEN** they load `acme.ma3ady.com/book`
- **THEN** slot times default to Berlin time
- **AND** a chip in the header offers "Show times in your timezone (Los Angeles)"

#### Scenario: toggle session-only
- **GIVEN** a visitor who toggled to their own TZ
- **WHEN** they close the tab and reopen the page
- **THEN** the page is back to tenant TZ default

### Requirement: Tenants SHALL get a per-tenant PWA manifest

A `<slug>.ma3ady.com/manifest.json` Route Handler SHALL return a manifest with the tenant's name, short_name, theme_color (from `tenants.brand_color`), and a single icon, so visitors who "Add to Home Screen" get a tile that resembles a tenant-branded app — without requiring per-tenant published apps in the App Store / Play Store.

#### Scenario: add-to-home-screen tile
- **GIVEN** a visitor on iOS Safari at `acme.ma3ady.com/book`
- **WHEN** they tap "Add to Home Screen"
- **THEN** the tile shows the name "Acme Clinic"
- **AND** opening the tile navigates back to `acme.ma3ady.com/book`
- **AND** the icon uses the ma3ady wordmark on the tenant's brand color

### Requirement: An "Open in app" affordance SHALL exist on every page but MUST NOT block the web flow

Every page SHALL include a dismissible "Open in app" banner with a deep link (`ma3ady://<slug>/...`) for customers who already have the app installed, but the web flow MUST be fully usable without it; the banner's dismiss state MUST persist for the session via cookie.

#### Scenario: banner shown on first visit
- **GIVEN** a visitor with no `app.openInAppDismissed` cookie
- **WHEN** they load any web-booking page
- **THEN** a banner is shown at the top: "Open in ma3ady app for a faster experience"
- **AND** tapping the banner opens the app via universal/deep link, falling back to the App Store / Play Store

#### Scenario: dismiss persists across pages
- **GIVEN** a visitor who dismissed the banner
- **WHEN** they navigate from `/book` to `/book/confirm` to `/manage/<token>`
- **THEN** the banner is hidden on every page
- **AND** opening a fresh browser session shows it again

### Requirement: The manage flow SHALL work entirely on web for guest bookings

The `<slug>.ma3ady.com/manage/<token>` page SHALL accept the same manage tokens issued by `book_appointment` (whether the original booking was made on web or mobile) and SHALL allow cancel and reschedule via the existing `manage-appointment` Edge Function. Tokens MUST validate via `verify_manage_token` exactly once per render.

#### Scenario: cancel via web
- **GIVEN** a guest holds a valid `manage_token` from an earlier mobile booking
- **WHEN** they open `acme.ma3ady.com/manage/<token>` and click Cancel
- **THEN** the appointment status updates to `cancelled`
- **AND** the manage page re-renders showing "Cancelled" with no further actions
- **AND** subsequent loads of the same URL show "this booking has been cancelled"

#### Scenario: reschedule via web
- **GIVEN** the same valid token, an active booking, and the service still has availability
- **WHEN** the guest picks a new slot and submits
- **THEN** `manage-appointment` updates `starts_at`/`ends_at`
- **AND** the same token continues to work for further actions until cancellation

### Requirement: The web surface SHALL be SEO-discoverable

Each `<slug>.ma3ady.com` page SHALL render `<title>` and `<meta description>` tags that include the tenant's name, plus JSON-LD `LocalBusiness` and (where appropriate) `Service` structured data so each tenant's subdomain is indexable as a distinct business.

#### Scenario: structured data present
- **GIVEN** a search engine crawls `acme.ma3ady.com/book`
- **WHEN** the page is rendered server-side
- **THEN** the response includes a `<script type="application/ld+json">` block with `@type: LocalBusiness`, the tenant's name, and the list of services as `@type: Service` children
- **AND** Google's structured-data validator parses it without errors
