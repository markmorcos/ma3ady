// claim-bookings Edge Function (Deno).
//
// Invoked by the mobile client right after the auth callback when
// `profiles.first_signed_in_at` is null. Walks `guest_contacts` rows by the
// caller's email, sets `claimed_by_user_id`, promotes matching `appointments`
// to `user_id`, and stamps `profiles.first_signed_in_at = now()` so subsequent
// sign-ins skip this entirely.
//
// The function uses the service role key for the privileged updates AFTER
// validating the caller's JWT and reading the email from there. The body is
// not trusted; the email is taken from the verified token only.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { withLogging } from '../_shared/withLogging.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type ClaimResult = {
  claimed_guest_contacts: number;
  claimed_appointments: number;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(
  withLogging('claim-bookings', async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: 'not_configured' }, 500);
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!jwt) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  // Read the user from the caller's JWT using the anon client.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }
  const user = userData.user;
  const email = user.email?.toLowerCase();
  if (!email) {
    return jsonResponse({ error: 'no_email' }, 400);
  }

  // Privileged client for the cross-table updates.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Mark guest_contacts as claimed.
  const { data: claimedContacts, error: contactsErr } = await admin
    .from('guest_contacts')
    .update({ claimed_by_user_id: user.id })
    .ilike('email', email)
    .is('claimed_by_user_id', null)
    .select('id');
  if (contactsErr) {
    return jsonResponse({ error: 'claim_contacts_failed', detail: contactsErr.message }, 500);
  }

  const contactIds = (claimedContacts ?? []).map((c: any) => c.id as string);

  // 2. Re-link matching appointments to the new auth user.
  let claimedAppointments = 0;
  if (contactIds.length > 0) {
    const { data: claimedAppts, error: apptErr } = await admin
      .from('appointments')
      .update({ user_id: user.id, guest_contact_id: null })
      .in('guest_contact_id', contactIds)
      .select('id');
    if (apptErr) {
      return jsonResponse({ error: 'claim_appointments_failed', detail: apptErr.message }, 500);
    }
    claimedAppointments = (claimedAppts ?? []).length;
  }

  // 3. Stamp profiles.first_signed_in_at so this runs once.
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ first_signed_in_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('first_signed_in_at', null);
  if (profileErr) {
    return jsonResponse({ error: 'profile_stamp_failed', detail: profileErr.message }, 500);
  }

  const result: ClaimResult = {
    claimed_guest_contacts: contactIds.length,
    claimed_appointments: claimedAppointments,
  };
  return jsonResponse(result);
  }),
);
