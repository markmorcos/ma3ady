// report-client-error Edge Function (Deno).
//
// Mobile-side error reporter. Validates payload shape + size, rate-limits per
// IP, optionally extracts user_id from the JWT, and inserts a client_errors
// row via the service role.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { log } from '../_shared/log.ts';
import { withLogging } from '../_shared/withLogging.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type Kind = 'boundary' | 'unhandled_rejection' | 'manual' | 'network' | 'rls_denied';

type Body = {
  kind?: Kind;
  message?: string;
  stack?: string;
  payload?: Record<string, unknown>;
  app_version?: string;
  platform?: string;
  locale?: string;
  tenant_id?: string;
};

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_PER_MIN = 30;

// Tiny in-process rate limiter. Each Edge Function worker has its own state;
// since we deploy 1+ workers, the effective rate is multiplied. Acceptable for
// abuse mitigation, not for strict quota enforcement.
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (b.count >= RATE_LIMIT_PER_MIN) return false;
  b.count++;
  return true;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const ALLOWED_KINDS: Kind[] = [
  'boundary',
  'unhandled_rejection',
  'manual',
  'network',
  'rls_denied',
];

Deno.serve(
  withLogging('report-client-error', async (req, { requestId }) => {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: 'not_configured' }, 500);
    }

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    if (!rateLimit(ip)) {
      log({ event: 'client_error_rate_limited', request_id: requestId, level: 'warn', ip });
      return jsonResponse({ error: 'rate_limited' }, 429);
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'payload_too_large' }, 413);
    }

    let body: Body;
    try {
      body = JSON.parse(raw);
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }

    if (
      !body.kind ||
      !ALLOWED_KINDS.includes(body.kind) ||
      !body.message ||
      typeof body.message !== 'string'
    ) {
      return jsonResponse({ error: 'invalid_payload' }, 400);
    }

    // Optional auth: extract user_id when a Bearer JWT is present.
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await userClient.auth.getUser();
      userId = data?.user?.id ?? null;
    }

    let tenantId: string | null = null;
    if (body.tenant_id && userId) {
      // Only accept tenant_id if the user is actually a member of it.
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await admin
        .from('memberships')
        .select('tenant_id')
        .eq('tenant_id', body.tenant_id)
        .eq('user_id', userId)
        .maybeSingle();
      if (data) tenantId = body.tenant_id;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.from('client_errors').insert({
      user_id: userId,
      tenant_id: tenantId,
      kind: body.kind,
      message: body.message.slice(0, 2048),
      stack: body.stack?.slice(0, 8192) ?? null,
      payload: body.payload ?? {},
      app_version: body.app_version ?? null,
      platform: body.platform ?? null,
      locale: body.locale ?? null,
    });
    if (error) {
      return jsonResponse({ error: 'insert_failed', detail: error.message }, 500);
    }

    log({
      event: 'client_error',
      request_id: requestId,
      level: 'warn',
      kind: body.kind,
      user_id: userId,
      tenant_id: tenantId,
      app_version: body.app_version,
      platform: body.platform,
      message: body.message,
    });

    return jsonResponse({ ok: true, request_id: requestId });
  }),
);
