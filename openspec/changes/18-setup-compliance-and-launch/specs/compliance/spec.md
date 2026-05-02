# compliance — Spec Delta

## ADDED Requirements

### Requirement: Users SHALL be able to export their data on demand

#### Scenario: export request
- **GIVEN** a signed-in user opens settings → Data & Privacy
- **WHEN** they tap "Download my data"
- **THEN** the `export-my-data` Edge Function returns a JSON blob containing their profile, memberships (slugs only), appointments, and related events
- **AND** the file is saved or shared via the platform share sheet
- **AND** no other user's data is included

### Requirement: Users SHALL be able to delete their account

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

#### Scenario: scheduled job
- **GIVEN** a cancelled appointment with `cancelled_at < now() - interval '90 days'`
- **WHEN** the daily `anonymize_old_appointments` job runs
- **THEN** the linked guest_contacts row has `name = '<anonymized>', phone = null, email = sha256(email)`
- **AND** the appointment row has `notes = null`
- **AND** the appointment id and timestamps remain (for tenant analytics)

### Requirement: No-show appointments SHALL be anonymized after 18 months

#### Scenario: long-tail anonymization
- **GIVEN** a no-show appointment with `created_at < now() - interval '18 months'`
- **WHEN** the daily job runs
- **THEN** PII is anonymized as above

### Requirement: Production builds SHALL ship native push and real dispatchers

#### Scenario: production build assertion
- **GIVEN** an `eas build --profile production` invocation
- **WHEN** the build runs
- **THEN** the bundle includes `expo-notifications`
- **AND** all dispatcher env vars are `real`
- **AND** the build completes successfully

### Requirement: RLS isolation SHALL be verified by an automated test suite

#### Scenario: pen-test pass
- **GIVEN** the `tests/security/rls.test.ts` suite
- **WHEN** CI runs
- **THEN** every cross-tenant probe (read & write attempts on each domain table by a forged JWT for the wrong tenant) returns either an empty result or a policy denial
- **AND** zero data leaks across tenants
- **AND** the suite is part of the CI gate — failing tests block merges

### Requirement: Privacy and Terms SHALL be available in EN and AR

#### Scenario: navigation from app
- **GIVEN** the data-and-privacy settings screen
- **WHEN** the user taps "Privacy Policy" or "Terms of Service"
- **THEN** the app opens the corresponding URL on `ma3ady.com` in the user's current locale
- **AND** the destination renders correctly with localized content

### Requirement: Store listings SHALL be versioned in the repo

#### Scenario: listings present
- **GIVEN** the `store/` directory
- **WHEN** inspected
- **THEN** subdirectories `apple/` and `google/` each contain title, description, keywords (Apple), screenshots, and privacy URL files
- **AND** translations exist for `en` and `ar`
- **AND** these files are the source of truth — changes to live store listings flow from this directory, not the other way around
