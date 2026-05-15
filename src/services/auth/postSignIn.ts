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
 * Routes the user after sign-in finishes.
 *
 * Policy:
 *   - If the caller passed an explicit `return_to`, replace the current
 *     (sign-in) screen with that path. This covers layout-redirect entries
 *     like `<Redirect href={{ pathname: '/sign-in', params: { return_to } }}/>`.
 *   - Otherwise, pop the sign-in screen off the stack rather than replacing
 *     it with `/`. This avoids leaving a duplicate home frame on the stack
 *     when the user came from `/ -> push /sign-in -> succeed` and then sees
 *     two `/` entries behind them.
 *   - If there's no stack to dismiss (e.g. user landed on /sign-in via
 *     deep link with no prior history), replace with the fallback.
 */
export function routeAfterSignIn(returnTo: unknown, fallback: string = '/'): void {
  const sanitized = sanitizeReturnTo(returnTo);
  if (sanitized) {
    router.replace(sanitized);
    return;
  }
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
