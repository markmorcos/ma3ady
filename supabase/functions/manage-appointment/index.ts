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

Deno.serve(async (req: Request) => {
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

  // action === 'reschedule'
  // Look up appointment to get tenant + service for the availability check.
  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .select('id, tenant_id, service_id, starts_at, ends_at, status')
    .eq('id', appointmentId)
    .single();
  if (apptErr || !appt) {
    return jsonResponse({ error: 'appointment_lookup_failed' }, 500);
  }

  const { data: service, error: serviceErr } = await admin
    .from('services')
    .select('duration_minutes')
    .eq('id', appt.service_id)
    .single();
  if (serviceErr || !service) {
    return jsonResponse({ error: 'service_lookup_failed' }, 500);
  }

  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .select('slug')
    .eq('id', appt.tenant_id)
    .single();
  if (tenantErr || !tenant) {
    return jsonResponse({ error: 'tenant_lookup_failed' }, 500);
  }

  const newStart = new Date(body.new_starts_at);
  const newEnd = new Date(newStart.getTime() + service.duration_minutes * 60_000);

  // Verify the requested slot is in the available set.
  const { data: slots, error: slotsErr } = await admin.rpc(
    'compute_available_slots',
    {
      p_tenant_slug: tenant.slug,
      p_service_id: appt.service_id,
      p_range_start: new Date(newStart.getTime() - 60_000).toISOString(),
      p_range_end: new Date(newEnd.getTime() + 60_000).toISOString(),
    },
  );
  if (slotsErr) {
    return jsonResponse({ error: 'availability_check_failed', detail: slotsErr.message }, 500);
  }

  const ok = (slots ?? []).some(
    (s: any) =>
      new Date(s.starts_at).getTime() === newStart.getTime() &&
      new Date(s.ends_at).getTime() === newEnd.getTime(),
  );
  if (!ok) {
    return jsonResponse({ error: 'slot_unavailable' }, 409);
  }

  // Apply the reschedule. EXCLUDE may still race-fail; map to slot_taken.
  const { data: updated, error: updErr } = await admin
    .from('appointments')
    .update({
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
    })
    .eq('id', appointmentId)
    .select('*')
    .single();
  if (updErr) {
    if (updErr.code === '23P01') {
      return jsonResponse({ error: 'slot_taken' }, 409);
    }
    return jsonResponse({ error: 'reschedule_failed', detail: updErr.message }, 500);
  }

  return jsonResponse({ appointment: updated, request_id: requestId });
});
