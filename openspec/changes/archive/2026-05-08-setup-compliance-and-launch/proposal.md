# Setup compliance and launch

## Why

Last mile before launching publicly. This change covers:

- Privacy + Terms in EN + AR (formalizing the drafts from the `setup-marketing-site` change)
- Data retention jobs (anonymize cancelled appointments after 90 days; retain no-shows 18 months)
- Account deletion flow (right to be forgotten)
- **Brand assets finalization** — replace placeholder wordmark/mark/icon/splash SVGs with designer-cut final assets across mobile, marketing, and tenant-landing
- Store listing prep (App Store + Play Store metadata, screenshots, privacy disclosures)
- Cutting the first **dev client** for native push notifications and native splash/icon
- Switching dispatchers from `mock` to `real` for the first preview/prod release
- Pen-test pass on RLS policies (cross-tenant probe)

This is the **first phase that requires a dev client**, per `project.md` §2. Up to this point everything has run in Expo Go.

## What Changes

- **ADDED** Edge Function `delete-account/`:
  - Authenticated user only
  - Anonymizes their guest_contacts (PII nulled, row kept)
  - Reassigns ownership of any `tenants` they solely own to no-one (or refuses delete; owner can't leave their own tenant orphan)
  - Deletes their `auth.users` row and cascades
- **ADDED** scheduled job `anonymize_old_appointments()` running daily via `pg_cron`:
  - Cancelled appointments older than 90 days: null `notes`, anonymize `guest_contacts.name/email/phone` to a hash
  - No-show appointments older than 18 months: same treatment
- **ADDED** UI: `(app)/(tabs)/settings/data-and-privacy.tsx` — "Download my data", "Delete my account" CTAs
- **ADDED** Edge Function `export-my-data/` returning a JSON dump of the user's appointments + profile (download as .json)
- **ADDED** completed legal pages (Privacy in EN+AR, Terms in EN+AR) with sub-processor list
- **ADDED** App Store metadata in `store/`:
  - `apple/{description.txt, keywords.txt, privacy-url.txt, screenshots/}` for EN + AR
  - `google/{title.txt, short-description.txt, full-description.txt, screenshots/, feature-graphic.png}`
  - Privacy-disclosure manifest for App Store: `app/privacy-info.json` listing data collection categories
- **MODIFIED** `eas.json` — production profile builds with native push module enabled
- **ADDED** `expo-notifications` dependency and push registration on first sign-in
- **MODIFIED** notifications dispatcher: `PUSH_DISPATCHER=real` now ships an `ExpoPushDispatcher` implementation
- **ADDED** RLS pen-test fixture: a Jest suite that uses two forged JWTs and runs ~30 cross-tenant probes to assert isolation
- **MODIFIED** `assets/branding/`: placeholder SVGs replaced with designer-cut final assets:
  - `wordmark-en.svg`, `wordmark-ar.svg` — final vector wordmarks
  - `mark.svg` — final clock-3 mark, single-color capable, optical adjustments at small sizes
  - `app-icon-1024.png` (iOS), `adaptive-icon-foreground.png` + `adaptive-icon-background.png` (Android), `icon-monochrome.svg` (Android 13+ themed icons)
  - `splash-light.png`, `splash-dark.png` (1284×2778 master, scaled by Expo)
  - `og-image.png` for marketing site (1200×630), `apple-touch-icon.png`, full favicon set
- **MODIFIED** `marketing/public/` and `tenant-landing/public/` to consume the same final mark/wordmark

## Impact

- Affects `compliance` capability (initial spec).
- Phase: **dev client required** (first time).
- Switches mobile to dev-client workflow for daily dev (`make build-dev-ios`, `make build-dev-android`).
- Final change before public launch.
