// reschedule-appointment Edge Function (Deno).
//
// Single source of truth for moving an appointment to a new time. Three auth
// paths converge here: staff JWT, the appointment owner's JWT, or a manage
// token (delegated from manage-appointment).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { withLogging } from '../_shared/withLogging.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type Input =
  | { appointment_id: string; new_starts_at: string }
  | { token: string; new_starts_at: string };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(
  withLogging('reschedule-appointment', async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: 'not_configured' }, 500);
  }

  let body: Input;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  if (!body.new_starts_at) {
    return jsonResponse({ error: 'missing_new_starts_at' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve the appointment via either the JWT/appointment_id path or the
  // manage-token path.
  let appointmentId: string | null = null;
  let actorUserId: string | null = null;
  let isGuestToken = false;

  if ('token' in body && body.token) {
    isGuestToken = true;
    const { data: id, error } = await admin.rpc('verify_manage_token', {
      p_token: body.token,
    });
    if (error || typeof id !== 'string') {
      return jsonResponse({ error: 'invalid_token' }, 401);
    }
    appointmentId = id;
  } else if ('appointment_id' in body && body.appointment_id) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'missing_auth' }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: 'unauthorized' }, 401);
    actorUserId = user.id;
    appointmentId = body.appointment_id;
  } else {
    return jsonResponse({ error: 'missing_appointment_id_or_token' }, 400);
  }

  // Load appointment + service + tenant slug.
  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .select('id, tenant_id, service_id, user_id, status')
    .eq('id', appointmentId)
    .single();
  if (apptErr || !appt) {
    return jsonResponse({ error: 'appointment_not_found' }, 404);
  }
  if (appt.status !== 'pending' && appt.status !== 'confirmed') {
    return jsonResponse({ error: 'cannot_reschedule', status: appt.status }, 409);
  }

  // Authorisation when the caller is a JWT (not guest token):
  //   either appointment.user_id matches OR membership role is staff+
  if (!isGuestToken) {
    if (appt.user_id !== actorUserId) {
      const { data: membership } = await admin
        .from('memberships')
        .select('role')
        .eq('tenant_id', appt.tenant_id)
        .eq('user_id', actorUserId)
        .maybeSingle();
      if (!membership || !['owner', 'admin', 'staff'].includes(membership.role)) {
        return jsonResponse({ error: 'forbidden' }, 403);
      }
    }
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
  if (Number.isNaN(newStart.getTime())) {
    return jsonResponse({ error: 'invalid_starts_at' }, 400);
  }
  const newEnd = new Date(newStart.getTime() + service.duration_minutes * 60_000);

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

  const requestId = crypto.randomUUID();
  try {
    await admin.rpc('set_app_context' as any, {
      p_request_id: requestId,
      p_is_guest_token: isGuestToken,
    } as any);
  } catch {
    // best-effort
  }

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

  // Write a 'rescheduled' event to the appointment events stream so audit and
  // notifications can react.
  await admin.from('appointment_events').insert({
    appointment_id: appointmentId,
    event_type: 'rescheduled',
    payload: {
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
    },
    by_user_id: actorUserId,
  });

  return jsonResponse({ appointment: updated, request_id: requestId });
  }),
);
