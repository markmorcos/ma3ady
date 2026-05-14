import { router } from 'expo-router';

/**
 * Returns a safe internal path or undefined. Rejects anything that could
 * navigate to an external origin (https://, protocol-relative //, scheme:).
 */
export function sanitizeReturnTo(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  if (!raw.startsWith('/')) return undefined;
  // Block protocol-relative URLs and Windows-style backslash tricks.
  if (raw.startsWith('//')) return undefined;
  if (raw.startsWith('/\\')) return undefined;
  return raw;
}

/**
 * Routes the user after sign-in finishes. Uses the return_to query param if
 * one was passed through the auth flow; otherwise falls back to home (or the
 * caller's preferred fallback). `replace` is intentional -- the sign-in screen
 * should never remain on the navigation stack once the user is authenticated.
 */
export function routeAfterSignIn(returnTo: unknown, fallback: string = '/'): void {
  const target = sanitizeReturnTo(returnTo) ?? fallback;
  router.replace(target);
}
