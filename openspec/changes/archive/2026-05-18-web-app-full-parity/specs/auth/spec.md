# auth spec delta

## ADDED Requirements

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
