// update-appointment-status Edge Function (Deno).
//
// Staff/owner/admin endpoint to change an appointment's status. Verifies the
// caller is a member with sufficient role of the appointment's tenant before
// mutating, validates the state transition, and threads audit context via
// set_app_context() so triggers can attribute the change.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { withLogging } from '../_shared/withLogging.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

const ALLOWED: Record<Status, Status[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(
  withLogging('update-appointment-status', async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: 'not_configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing_auth' }, 401);

  let body: { appointment_id?: string; status?: Status };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  if (!body.appointment_id || !body.status) {
    return jsonResponse({ error: 'missing_fields' }, 400);
  }
  if (!Object.prototype.hasOwnProperty.call(ALLOWED, body.status)) {
    return jsonResponse({ error: 'invalid_status' }, 400);
  }

  // User-scoped client for identity check.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) return jsonResponse({ error: 'unauthorized' }, 401);

  // Service-role client bypasses RLS for the cross-tenant role check + update.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .select('id, tenant_id, status, starts_at, ends_at')
    .eq('id', body.appointment_id)
    .single();
  if (apptErr || !appt) return jsonResponse({ error: 'appointment_not_found' }, 404);

  const { data: membership } = await admin
    .from('memberships')
    .select('role')
    .eq('tenant_id', appt.tenant_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership || !['owner', 'admin', 'staff'].includes(membership.role)) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  const allowed = ALLOWED[appt.status as Status] ?? [];
  if (!allowed.includes(body.status)) {
    return jsonResponse(
      { error: 'invalid_transition', from: appt.status, to: body.status },
      409,
    );
  }

  const requestId = crypto.randomUUID();
  try {
    await admin.rpc('set_app_context' as any, {
      p_request_id: requestId,
      p_is_guest_token: false,
    } as any);
  } catch {
    // Best-effort audit threading.
  }

  const updates: Record<string, unknown> = { status: body.status };
  if (body.status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
    updates.cancelled_by_user_id = user.id;
  }

  const { data: updated, error: updErr } = await admin
    .from('appointments')
    .update(updates)
    .eq('id', body.appointment_id)
    .select('*')
    .single();
  if (updErr) {
    return jsonResponse({ error: 'update_failed', detail: updErr.message }, 500);
  }

  return jsonResponse({ appointment: updated, request_id: requestId });
  }),
);
