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

