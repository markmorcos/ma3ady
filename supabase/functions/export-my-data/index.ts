// export-my-data Edge Function (Deno).
//
// GDPR / right-to-access endpoint. Returns a JSON blob of everything we
// store about the caller: profile, memberships (tenant slugs only — no
// other tenant data), appointments, guest_contacts they've claimed, and
// the appointment_events scoped to those appointments.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { withLogging } from '../_shared/withLogging.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

function jsonResponse(body: unknown, status = 200, attachmentName?: string): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (attachmentName) {
    headers['content-disposition'] = `attachment; filename="${attachmentName}"`;
  }
  return new Response(JSON.stringify(body, null, 2), { status, headers });
}

Deno.serve(
  withLogging('export-my-data', async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: 'not_configured' }, 500);
  }

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return jsonResponse({ error: 'unauthorized' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return jsonResponse({ error: 'unauthorized' }, 401);
  const user = userData.user;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Profile
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Memberships — only the tenant slug + role (we don't expose other
  // tenants' data even if the user is a member).
  const { data: memberships } = await admin
    .from('memberships')
    .select('role, tenant:tenants(id, slug, name)')
    .eq('user_id', user.id);

  // Appointments — by user_id directly OR via guest_contacts claimed by them.
  const { data: claimedContacts } = await admin
    .from('guest_contacts')
    .select('id, name, email, phone, locale, claimed_at:created_at')
    .eq('claimed_by_user_id', user.id);
  const guestIds = (claimedContacts ?? []).map((c: any) => c.id as string);

  const { data: byUser } = await admin
    .from('appointments')
    .select('*')
    .eq('user_id', user.id);
  let byGuest: any[] = [];
  if (guestIds.length > 0) {
    const { data } = await admin
      .from('appointments')
      .select('*')
      .in('guest_contact_id', guestIds);
    byGuest = data ?? [];
  }
  const appointments = [...(byUser ?? []), ...byGuest];
  const apptIds = appointments.map((a: any) => a.id as string);

  let events: any[] = [];
  if (apptIds.length > 0) {
    const { data } = await admin
      .from('appointment_events')
      .select('*')
      .in('appointment_id', apptIds)
      .order('created_at', { ascending: true });
    events = data ?? [];
  }

  const { data: pushTokens } = await admin
    .from('push_tokens')
    .select('id, token, platform, active, created_at, last_seen_at')
    .eq('user_id', user.id);

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile,
    memberships: memberships ?? [],
    appointments,
    appointment_events: events,
    guest_contacts: claimedContacts ?? [],
    push_tokens: pushTokens ?? [],
  };

  return jsonResponse(payload, 200, `ma3ady-export-${user.id}.json`);
  }),
);
