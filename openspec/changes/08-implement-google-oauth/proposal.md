# Implement Google OAuth

## Why

Per `project.md` §5, Supabase Google OAuth is the only sign-in path for v1 (no magic link, no email/password). This change wires it up end-to-end for the mobile app, in a way that **runs in Expo Go** (no native module). When we eventually cut a dev client, we can layer in `@react-native-google-signin/google-signin` for one-tap, but that's deferred.

This change also implements the "claim prior anonymous bookings" feature: when a user signs in with Google for the first time, any `guest_contacts` rows matching their email are linked to the new user, and corresponding `appointments` are made visible in their "My bookings" list.

## What Changes

- **ADDED** Supabase project configuration: enable `[auth.external.google]` provider in `config.toml`; production secrets via `supabase secrets set GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET ...`
- **ADDED** `auth.ma3ady.com/callback` route (lives in the tenant-landing app from change 16; in dev, Expo proxy URL is used)
- **ADDED** dependencies: `expo-auth-session`, `expo-web-browser`, `expo-crypto`
- **ADDED** `src/services/auth/googleSignIn.ts` — runs `WebBrowser.openAuthSessionAsync()` against Supabase's OAuth URL with PKCE, handles the redirect, exchanges code for session
- **MODIFIED** `src/state/authStore.ts` — adds `signInWithGoogle()`, `signOut()`, full session lifecycle
- **ADDED** `app/(auth)/_layout.tsx`, `app/(auth)/sign-in.tsx` — sign-in screen
- **ADDED** `app/auth/callback.tsx` — deep-link handler that reads `?code=...` and calls `exchangeCodeForSession`
- **ADDED** Edge Function `claim-bookings/` — invoked client-side on first sign-in: finds `guest_contacts` rows by email, sets `claimed_by_user_id`, and updates relevant `appointments.user_id`
- **ADDED** `src/services/api/claimBookings.ts` — invokes the Edge Function
- **MODIFIED** `app/_layout.tsx` — boot sequence now: i18n → auth restore → tenant resolve → render
- **ADDED** `EXPO_PUBLIC_AUTH_REDIRECT_URI` env var (defaults to the Expo dev proxy in development, `ma3ady://auth/callback` in production)

## Impact

- Affects `auth` capability (initial spec).
- Required by changes 09, 11, 13.
- Anonymous booking flow (change 10) does not depend on this — guests never sign in. But the "claim prior bookings" feature does.
- **Phase: Expo Go-compatible.** Native Google Sign-In is deferred.
