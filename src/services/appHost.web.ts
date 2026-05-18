// Web build derives the share-link host from the browser's own origin.
// On preview-app.ma3ady.com that returns https://preview-app.ma3ady.com;
// on app.ma3ady.com it returns https://app.ma3ady.com. Local `expo start
// --web` returns http://localhost:8081 — share links during dev point
// back at the dev server, which is the expected behavior.

export function appHost(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  // SSR / SSG safety guard; never reached in the SPA at runtime.
  return 'https://app.ma3ady.com';
}
