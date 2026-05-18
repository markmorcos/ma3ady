# auth Specification

## Purpose
TBD - created by archiving change implement-google-oauth. Update Purpose after archive.
## Requirements
### Requirement: Google OAuth SHALL be the only authentication method

Supabase Auth SHALL be configured with Google as the only enabled provider — email/password and magic-link signups MUST be disabled in `config.toml`, and the sign-in screen renders only "Continue with Google" plus the guest CTA.

#### Scenario: sign-in screen rendered
- **GIVEN** an unauthenticated user opens the app
- **WHEN** the sign-in screen renders
- **THEN** "Continue with Google" is the only sign-in CTA shown
- **AND** "Continue as guest" is offered as an alternative path
- **AND** no email or password input is rendered

#### Scenario: email/password attempt blocked
- **GIVEN** a curl call to `/auth/v1/signup` against the Supabase project
- **WHEN** the call is made with email + password
- **THEN** the response is HTTP 400/422 with "signups disabled"

### Requirement: The OAuth flow SHALL work in Expo Go without a dev client

The sign-in implementation SHALL use `expo-auth-session` + `WebBrowser.openAuthSessionAsync` against `EXPO_PUBLIC_AUTH_REDIRECT_URI` so the full PKCE flow MUST complete in Expo Go without any native module.

#### Scenario: dev sign-in
- **GIVEN** a developer running the app in Expo Go on a physical device
- **AND** `EXPO_PUBLIC_AUTH_REDIRECT_URI` set to the Expo auth proxy URL
- **WHEN** they tap "Continue with Google"
- **THEN** the system browser opens, displays Google's consent screen
- **AND** after consent, the app receives the callback and the session is established
- **AND** no native module is required

### Requirement: Sessions SHALL persist across app cold starts

The Supabase client SHALL use SecureStore for session storage and `authStore.refresh()` MUST restore the prior session at boot so users do not see the sign-in screen after a relaunch.

#### Scenario: sign-in then relaunch
- **GIVEN** a user who has signed in
- **WHEN** they kill and relaunch the app
- **THEN** `authStore.refresh()` restores the session from SecureStore
- **AND** the user lands on the authenticated home, not the sign-in screen

### Requirement: Sign-out SHALL clear all local credentials and state

Tapping "Sign out" SHALL call `supabase.auth.signOut()`, clear SecureStore session keys, reset the zustand `authStore`, and clear `AsyncStorage['app.tenantId']`; no client-side credential MUST survive the action.

#### Scenario: explicit sign-out
- **GIVEN** an authenticated user
- **WHEN** they tap "Sign out" in settings
- **THEN** `supabase.auth.signOut()` is called
- **AND** SecureStore session keys are removed
- **AND** the zustand `authStore` is reset to its initial state
- **AND** `AsyncStorage['app.tenantId']` is cleared
- **AND** the user is navigated to the sign-in screen

### Requirement: First sign-in SHALL claim prior anonymous bookings with the same email

When `profiles.first_signed_in_at` is null after auth callback, the app SHALL invoke the `claim-bookings` Edge Function which MUST update matching `guest_contacts` and `appointments` rows to the new `user_id` and stamp `first_signed_in_at = now()` so claiming runs exactly once per user.

#### Scenario: new sign-in with prior guest bookings
- **GIVEN** anonymous bookings under `jane@example.com` for tenant `acme`
- **AND** Jane signs in with a Google account whose verified email is `jane@example.com`
- **WHEN** the auth callback completes
- **AND** `profiles.first_signed_in_at` is null
- **THEN** the `claim-bookings` Edge Function is invoked
- **AND** matching `guest_contacts` rows are updated with `claimed_by_user_id = jane.id`
- **AND** matching `appointments` rows are updated with `user_id = jane.id, guest_contact_id = null`
- **AND** Jane sees the bookings under "My bookings" on her authenticated home
- **AND** `profiles.first_signed_in_at` is set to `now()`

#### Scenario: subsequent sign-in skips the claim
- **GIVEN** Jane has signed in once before
- **WHEN** she signs in again (new session)
- **THEN** `claim-bookings` is NOT invoked
- **AND** `profiles.first_signed_in_at` remains unchanged

### Requirement: The auth callback SHALL fail safely on timeout

The `app/auth/callback.tsx` route SHALL bound `exchangeCodeForSession(code)` with a 10-second timeout and on expiry MUST surface a "sign-in took too long" error without leaving the app in a partially-authenticated state.

#### Scenario: code exchange timeout
- **GIVEN** the auth callback is invoked
- **WHEN** `exchangeCodeForSession(code)` does not resolve within 10 seconds
- **THEN** the callback screen shows a "sign-in took too long, try again" error
- **AND** the user can return to the sign-in screen
- **AND** no session is partially established


### Requirement: The web sign-in SHALL use Supabase Google OAuth without the auth-subdomain bounce

The web client at `app.ma3ady.com` SHALL invoke `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback' } })` and rely on the Supabase web client's `detectSessionInUrl: true` setting to exchange the OAuth code on return. The `auth.ma3ady.com/callback` bounce subdomain MUST remain mobile-only — web sign-in MUST NOT route through it.

#### Scenario: web sign-in registers a direct redirect URI
- **GIVEN** the Supabase project's auth settings and the Google Cloud Console OAuth client
- **WHEN** the project is configured for production
- **THEN** `https://app.ma3ady.com/auth/callback` and `https://preview-app.ma3ady.com/auth/callback` are registered as authorized redirect URIs in both
- **AND** `https://app.ma3ady.com` and `https://preview-app.ma3ady.com` are included in Supabase's `additional_redirect_urls`

#### Scenario: web sign-in completes without the auth subdomain
- **GIVEN** a visitor on `https://app.ma3ady.com/sign-in`
- **WHEN** they click "Continue with Google" and consent
- **THEN** the final redirect after Google is `https://app.ma3ady.com/auth/callback?code=...`
- **AND** the URL never passes through `auth.ma3ady.com` for this flow
- **AND** `authStore.session` populates within 10 seconds via `onAuthStateChange`

### Requirement: Supabase session storage SHALL be platform-aware

`src/services/api/supabase.ts` SHALL be split into `.native.ts` (SecureStore-backed adapter, `detectSessionInUrl: false`) and `.web.ts` (no custom storage, `detectSessionInUrl: true`, `persistSession: true`, `autoRefreshToken: true`). Feature code MUST import from the platform-agnostic entry point `src/services/api/supabase.ts`.

#### Scenario: native client keeps the SecureStore adapter
- **GIVEN** the mobile build
- **WHEN** the Supabase client is constructed
- **THEN** the `storage` option references the SecureStore-backed adapter as today
- **AND** `detectSessionInUrl` is `false`

#### Scenario: web client uses `localStorage`
- **GIVEN** the web build
- **WHEN** the Supabase client is constructed
- **THEN** no `storage` option is supplied (Supabase defaults to `localStorage`)
- **AND** `detectSessionInUrl` is `true`
- **AND** `persistSession` is `true` and `autoRefreshToken` is `true`

### Requirement: Web sign-out SHALL remove `localStorage` session keys and reset all in-memory state

`supabase.auth.signOut()` on web SHALL remove the `sb-*-auth-token` keys from `localStorage`. The application MUST additionally reset the zustand `authStore`, clear `tenantStore`, and navigate to `/sign-in`. No client-side credential MUST survive the action on web.

#### Scenario: sign-out on web
- **GIVEN** an authenticated user on `app.ma3ady.com/settings`
- **WHEN** they tap "Sign out"
- **THEN** `supabase.auth.signOut()` is called
- **AND** `localStorage` no longer contains any `sb-*-auth-token` key
- **AND** the zustand `authStore` is reset to its initial state
- **AND** `tenantStore` is cleared
- **AND** the user is navigated to `/sign-in`

### Requirement: First sign-in on web SHALL claim prior anonymous bookings identically to mobile

The web auth callback SHALL invoke the `claim-bookings` Edge Function via the same code path the mobile callback uses when `profiles.first_signed_in_at` is null. The claim MUST run exactly once per user regardless of which platform the user signed in on first.

#### Scenario: customer with prior guest bookings signs in on web
- **GIVEN** anonymous bookings under `jane@example.com` for tenant `acme`
- **AND** Jane has never signed in
- **WHEN** Jane signs in with Google on `app.ma3ady.com`
- **AND** the callback completes
- **THEN** the `claim-bookings` Edge Function is invoked
- **AND** matching `guest_contacts` and `appointments` rows are updated to her `user_id`
- **AND** `profiles.first_signed_in_at` is set to `now()`
- **AND** subsequent sign-ins on either platform skip the claim
