import { corsPreflightResponse, isCorsPreflight, withCorsHeaders } from './cors.ts';
import { log } from './log.ts';

type Handler = (req: Request, ctx: { requestId: string }) => Promise<Response>;

export function withLogging(name: string, handler: Handler): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // CORS preflight bypasses the handler entirely — supabase-js + the browser
    // need a 2xx OPTIONS response with Access-Control-Allow-* before they'll
    // dispatch the actual POST.
    if (isCorsPreflight(req)) return corsPreflightResponse();

    const requestId = crypto.randomUUID();
    const start = performance.now();
    log({ event: 'function_start', function: name, request_id: requestId, method: req.method });
    try {
      const res = await handler(req, { requestId });
      const duration_ms = Math.round(performance.now() - start);
      log({
        event: 'function_end',
        function: name,
        request_id: requestId,
        status: res.status,
        duration_ms,
      });
      const headers = new Headers(res.headers);
      if (!headers.has('x-request-id')) headers.set('x-request-id', requestId);
      return withCorsHeaders(new Response(res.body, { status: res.status, headers }));
    } catch (err) {
      const duration_ms = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : 'unknown_error';
      const stack = err instanceof Error ? err.stack : undefined;
      log({
        event: 'function_error',
        function: name,
        request_id: requestId,
        level: 'error',
        message,
        stack,
        duration_ms,
      });
      return withCorsHeaders(
        new Response(
          JSON.stringify({ error: 'internal_error', request_id: requestId }),
          {
            status: 500,
            headers: { 'content-type': 'application/json', 'x-request-id': requestId },
          },
        ),
      );
    }
  };
}
