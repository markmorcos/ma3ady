// manage-appointment Edge Function (Deno).
//
// Guest-token-driven cancel / reschedule. The caller proves possession of the
// appointment by passing the plaintext manage token (the ma3ady://manage/<token>
// deep-link payload). The function verifies the token via verify_manage_token,
// then performs the requested action with service-role privileges.
//
// Carry-over from setup-tenant-audit-log task 1.7 / 1.8: at the start of the
// DB transaction, the function sets `app.request_id` and `app.is_guest_token`
// GUCs so audit-log triggers can attribute the action back to this Edge
// Function invocation and record `by_kind = 'guest_token'`.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { withLogging } from '../_shared/withLogging.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type CancelInput = {
  token: string;
  action: 'cancel';
};

type RescheduleInput = {
  token: string;
  action: 'reschedule';
  new_starts_at: string;
};

type ManageInput = CancelInput | RescheduleInput;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(
  withLogging('manage-appointment', async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'not_configured' }, 500);
  }

  let body: ManageInput;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  if (!body.token || typeof body.token !== 'string') {
    return jsonResponse({ error: 'missing_token' }, 400);
  }
  if (body.action !== 'cancel' && body.action !== 'reschedule') {
    return jsonResponse({ error: 'invalid_action' }, 400);
  }
  if (body.action === 'reschedule' && !body.new_starts_at) {
    return jsonResponse({ error: 'missing_new_starts_at' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const requestId = crypto.randomUUID();

  // Thread context for audit triggers via the set_app_context RPC. The RPC
  // is best-effort: if it isn't deployed yet (older local stacks), audit
  // rows just record the default attribution. We don't fail the cancel.
  try {
    await admin.rpc('set_app_context' as any, {
      p_request_id: requestId,
      p_is_guest_token: true,
    } as any);
  } catch {
    // ignore — audit threading is best-effort
  }

  // Verify the token. verify_manage_token raises if cancelled or unknown;
  // the supabase-js layer surfaces that as `error`.
  const { data: appointmentId, error: verifyErr } = await admin.rpc(
    'verify_manage_token',
    { p_token: body.token },
  );
  if (verifyErr || !appointmentId) {
    return jsonResponse({ error: 'invalid_token', request_id: requestId }, 401);
  }

  if (body.action === 'cancel') {
    const { data, error } = await admin
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .select('*')
      .single();
    if (error) {
      return jsonResponse({ error: 'cancel_failed', detail: error.message }, 500);
    }
    return jsonResponse({ appointment: data, request_id: requestId });
  }

  // action === 'reschedule' — delegate to reschedule-appointment so all three
  // callers (admin, customer, guest token) share the same logic.
  const fnUrl = `${supabaseUrl}/functions/v1/reschedule-appointment`;
  const fnRes = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // service-role bypasses verify_jwt; the manage token IS the auth.
      authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      token: body.token,
      new_starts_at: body.new_starts_at,
    }),
  });
  const fnBody = await fnRes.json().catch(() => ({}));
  return jsonResponse(fnBody, fnRes.status);
  }),
);
