# compliance — Spec Delta

## ADDED Requirements

### Requirement: Users SHALL be able to export their data on demand

The `export-my-data` Edge Function SHALL return a JSON blob containing the caller's profile, memberships (slugs only), appointments, and related events; the response MUST exclude any other user's data and be saveable via the platform share sheet.

#### Scenario: export request
- **GIVEN** a signed-in user opens settings → Data & Privacy
- **WHEN** they tap "Download my data"
- **THEN** the `export-my-data` Edge Function returns a JSON blob containing their profile, memberships (slugs only), appointments, and related events
- **AND** the file is saved or shared via the platform share sheet
- **AND** no other user's data is included

### Requirement: Users SHALL be able to delete their account

The `delete-my-account` Edge Function SHALL call `auth.admin.deleteUser`, anonymize linked `guest_contacts`, and cascade-delete `memberships`/`push_tokens`; if the caller is the sole owner of any tenant, the function MUST return `transfer_ownership_first` and perform no deletion.

#### Scenario: delete with no sole-ownership
- **GIVEN** a user who does not solely own any tenant
- **WHEN** they confirm "Delete my account"
- **THEN** the function calls `auth.admin.deleteUser(user.id)`
- **AND** their guest_contacts (if any were claimed) are anonymized
- **AND** their memberships and push_tokens cascade-delete
- **AND** the user is signed out and returned to the sign-in screen with a "your account has been deleted" toast

#### Scenario: delete blocked by sole ownership
- **GIVEN** the user is the only owner of tenant `acme`
- **WHEN** they request deletion
- **THEN** the function returns `{ error: 'transfer_ownership_first', tenants: ['acme'] }`
- **AND** no deletion is performed
- **AND** the UI guides them to invite a co-owner first

### Requirement: Cancelled appointments SHALL be anonymized after 90 days

The daily `anonymize_old_appointments` job SHALL find cancelled appointments older than 90 days and MUST null PII on the linked `guest_contacts` (`name = '<anonymized>', phone = null, email = sha256(email)`) plus clear `appointments.notes`, while keeping the appointment id and timestamps for tenant analytics.

#### Scenario: scheduled job
- **GIVEN** a cancelled appointment with `cancelled_at < now() - interval '90 days'`
- **WHEN** the daily `anonymize_old_appointments` job runs
- **THEN** the linked guest_contacts row has `name = '<anonymized>', phone = null, email = sha256(email)`
- **AND** the appointment row has `notes = null`
- **AND** the appointment id and timestamps remain (for tenant analytics)

### Requirement: No-show appointments SHALL be anonymized after 18 months

The same daily job SHALL anonymize no-show appointments whose `created_at` is older than 18 months, applying the identical PII null-out rules as for cancelled appointments.

#### Scenario: long-tail anonymization
- **GIVEN** a no-show appointment with `created_at < now() - interval '18 months'`
- **WHEN** the daily job runs
- **THEN** PII is anonymized as above

### Requirement: Production builds SHALL ship native push and real dispatchers

The `eas build --profile production` configuration SHALL include `expo-notifications` and MUST assert every dispatcher env var (`EMAIL_DISPATCHER`, `WHATSAPP_DISPATCHER`, `PUSH_DISPATCHER`) equals `real` before bundling.

#### Scenario: production build assertion
- **GIVEN** an `eas build --profile production` invocation
- **WHEN** the build runs
- **THEN** the bundle includes `expo-notifications`
- **AND** all dispatcher env vars are `real`
- **AND** the build completes successfully

### Requirement: RLS isolation SHALL be verified by an automated test suite

`tests/security/rls.test.ts` SHALL forge JWTs for the wrong tenant and probe every domain table for leak; CI MUST gate merges on this suite passing with zero data leaks.

#### Scenario: pen-test pass
- **GIVEN** the `tests/security/rls.test.ts` suite
- **WHEN** CI runs
- **THEN** every cross-tenant probe (read & write attempts on each domain table by a forged JWT for the wrong tenant) returns either an empty result or a policy denial
- **AND** zero data leaks across tenants
- **AND** the suite is part of the CI gate — failing tests block merges

### Requirement: Privacy and Terms SHALL be available in EN and AR

The data-and-privacy settings screen SHALL link to `https://ma3ady.com/privacy/` and `/terms/` in the user's current locale, and the destination MUST render localized content for both `en` and `ar`.

#### Scenario: navigation from app
- **GIVEN** the data-and-privacy settings screen
- **WHEN** the user taps "Privacy Policy" or "Terms of Service"
- **THEN** the app opens the corresponding URL on `ma3ady.com` in the user's current locale
- **AND** the destination renders correctly with localized content

### Requirement: Store listings SHALL be versioned in the repo

The `store/apple/` and `store/google/` directories SHALL contain title, description, keywords (Apple), screenshots, and privacy URL files in `en` and `ar`; these checked-in files MUST be the source of truth — live listings flow from this directory, not the other way.

#### Scenario: listings present
- **GIVEN** the `store/` directory
- **WHEN** inspected
- **THEN** subdirectories `apple/` and `google/` each contain title, description, keywords (Apple), screenshots, and privacy URL files
- **AND** translations exist for `en` and `ar`
- **AND** these files are the source of truth — changes to live store listings flow from this directory, not the other way around

### Requirement: Final brand assets SHALL replace placeholders before store submission

A pre-submit check SHALL grep `assets/branding/`, `marketing/public/`, and `tenant-landing/public/` for the string `PLACEHOLDER` and MUST fail if any match remains; the final SVG/PNG masters (app icon, adaptive icon, themed Android icon, OG image) must be in place and signed off by the brand designer.

#### Scenario: placeholder asset detection
- **GIVEN** any file in `assets/branding/`, `marketing/public/`, or `tenant-landing/public/`
- **WHEN** the placeholder check (`grep -r "PLACEHOLDER" assets/ marketing/public/ tenant-landing/public/`) runs
- **THEN** zero matches are returned
- **AND** the corresponding final SVG/PNG masters are present and signed off by the brand designer

#### Scenario: app icon roundtrip
- **GIVEN** the final 1024×1024 iOS icon master
- **WHEN** `eas build --profile production` packages the iOS bundle
- **THEN** the bundle's `Icon-1024.png` matches the master's checksum
- **AND** the same applies to Android adaptive icons + monochrome themed icon

#### Scenario: marketing OG image
- **GIVEN** a Twitter / Facebook share preview of `https://ma3ady.com`
- **WHEN** the OG image is fetched
- **THEN** it is the final 1200×630 designer-produced image, not a placeholder
