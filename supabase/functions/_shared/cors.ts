// CORS helpers for browser-callable Edge Functions.
//
// The mobile clients (RN fetch) don't enforce CORS, so prior to the web app
// landing on app.ma3ady.com these functions ran without origin headers at all.
// The web build now issues cross-origin POSTs from app.ma3ady.com /
// preview-app.ma3ady.com to <project>.supabase.co/functions/v1/<name>; the
// browser preflights with OPTIONS, and without a 2xx response carrying
// Access-Control-Allow-* headers the actual call never goes through and
// supabase-js surfaces "Failed to send a request to the Edge Function".
//
// We use `*` for the origin because every endpoint authenticates via the
// Authorization / apikey headers (or a guest manage-token in the body) —
// never via cookies — so opening up the origin doesn't grant a browser any
// access it couldn't already exercise from a non-browser client. The
// remaining allow-list is the union of headers + methods supabase-js may
// send.

export const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, x-client-info, apikey, content-type, x-request-id',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-max-age': '86400',
};

export function isCorsPreflight(req: Request): boolean {
  return req.method === 'OPTIONS';
}

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function withCorsHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, headers });
}
