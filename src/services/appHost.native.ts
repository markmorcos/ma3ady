// Native build can't ask the OS for "where would this app be served on
// the web?" — that's a build-time decision. EAS profiles inject the
// correct host via EXPO_PUBLIC_APP_HOST (preview-app.ma3ady.com for
// preview, app.ma3ady.com for production).

const FALLBACK = 'app.ma3ady.com';

export function appHost(): string {
  const host = process.env.EXPO_PUBLIC_APP_HOST?.trim();
  return `https://${host || FALLBACK}`;
}
