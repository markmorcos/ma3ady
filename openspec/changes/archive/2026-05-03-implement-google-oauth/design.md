# Design

## Context

Two real challenges:

1. **OAuth in Expo Go** — Expo Go doesn't support custom URI schemes natively. We use Expo's auth proxy (`https://auth.expo.io/...`) as the redirect URI in dev; in production builds we use a deep link `ma3ady://auth/callback`. Both flow through `WebBrowser.openAuthSessionAsync` which works in Expo Go.

2. **Anonymous-then-authenticated** — a guest books with email `jane@x.com`, then later signs in with Google using the same email. Their bookings should "follow" them. We do this server-side in an Edge Function so it's atomic and so the client doesn't need elevated permissions.

## Goals

- Sign in with Google → land in app, session persists.
- "Continue as guest" remains an option from the sign-in screen.
- Prior anonymous bookings link automatically on first sign-in with a matching email.
- All flows work in Expo Go.

## Non-Goals

- Native Google Sign-In (`@react-native-google-signin/google-signin`) — needs a dev client.
- Apple Sign-In — required by App Store if we add other social providers (Apple's "if you have one, you must have us" rule), but since Google is the only provider, Apple becomes optional. Add later if/when App Store rejects.
- Magic link / email-password — explicitly disabled.
- Web sign-in — there is no web app; auth happens in mobile only.

## Decisions

1. **Expo auth proxy in dev, deep link in production**. The proxy gives us a stable HTTPS redirect for OAuth providers without claiming a real domain in dev. In production, `ma3ady://auth/callback` is registered via Expo's `scheme: "ma3ady"` in `app.json`. Both routes terminate at `app/auth/callback.tsx`.
2. **PKCE + SecureStore for verifier**. The verifier never leaves the device. Without PKCE, an attacker who intercepts the redirect URL with the code can exchange it themselves.
3. **`claim-bookings` is Edge Function, not RLS**. The operation crosses ownership: anonymous booking belongs to a `guest_contacts` row; we promote it to belong to the new `auth.user`. Doing this via RLS would require a complex policy; doing it via SECURITY DEFINER function in an Edge Function is straightforward and auditable.
4. **Claim runs at most once per user**. We mark `profiles.first_signed_in_at` so subsequent sessions don't re-run the claim. Idempotent anyway (the SQL is safe to repeat), but skipping the network call is cheap.
5. **"Continue as guest" preserves the booking context**. If the user came from a tenant booking flow, the sign-in screen has a "skip" link that returns them to that flow. They can still book; we just don't have a Google identity.
6. **Sign-out clears everything local**. SecureStore session, zustand state, AsyncStorage tenant selection. Privacy-conscious.
7. **The boot sequence is `i18n → auth restore → tenant resolve → render`**. Each step holds the splash. If any step takes >2s, we show the splash with a tiny spinner. Sign-in failure does not block the app — user lands on the sign-in screen.
8. **No "remember me" toggle**. Sessions are remembered by default (PKCE + refresh token). Users sign out explicitly.
