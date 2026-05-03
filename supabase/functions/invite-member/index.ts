// invite-member Edge Function (Deno).
//
// Owner/admin invites a user by email + role. If the invitee already has an
// auth.users row, insert the membership directly. Otherwise queue a
// pending_memberships row that the handle_new_user trigger promotes on first
// sign-in, and send a Supabase Auth invitation email.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type InviteInput = {
  tenant_id?: string;
  email?: string;
  role?: 'admin' | 'staff' | 'customer';
};

type InviteResult =
  | { status: 'added'; user_id: string }
  | { status: 'invited'; email: string };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const ROLES = new Set(['admin', 'staff', 'customer']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

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
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return jsonResponse({ error: 'unauthorized' }, 401);
  const user = userData.user;

  let body: InviteInput;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const tenantId = body.tenant_id ?? '';
  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role ?? 'staff';

  if (!tenantId) return jsonResponse({ error: 'invalid_tenant_id' }, 400);
  if (!EMAIL_RE.test(email)) return jsonResponse({ error: 'invalid_email' }, 400);
  if (!ROLES.has(role)) return jsonResponse({ error: 'invalid_role' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller is owner/admin of tenant_id.
  const { data: callerMembership, error: callerErr } = await admin
    .from('memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (callerErr) {
    return jsonResponse({ error: 'membership_lookup_failed', detail: callerErr.message }, 500);
  }
  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  // Look up the invitee by email via the admin auth API.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    return jsonResponse({ error: 'user_lookup_failed', detail: listErr.message }, 500);
  }
  const existing = (list?.users ?? []).find(
    (u: any) => (u.email ?? '').toLowerCase() === email,
  );

  if (existing) {
    const { error: insertErr } = await admin
      .from('memberships')
      .insert({ tenant_id: tenantId, user_id: existing.id, role })
      .single();
    if (insertErr) {
      if (insertErr.code === '23505') {
        return jsonResponse({ error: 'already_member' }, 409);
      }
      return jsonResponse({ error: 'membership_insert_failed', detail: insertErr.message }, 500);
    }
    const result: InviteResult = { status: 'added', user_id: existing.id };
    return jsonResponse(result);
  }

  // Send invitation email + queue the pending row.
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteErr) {
    return jsonResponse({ error: 'invite_email_failed', detail: inviteErr.message }, 500);
  }

  const { error: pendingErr } = await admin.from('pending_memberships').upsert(
    { tenant_id: tenantId, email, role, invited_by_user_id: user.id },
    { onConflict: 'tenant_id,email' },
  );
  if (pendingErr) {
    return jsonResponse({ error: 'pending_insert_failed', detail: pendingErr.message }, 500);
  }

  const result: InviteResult = { status: 'invited', email };
  return jsonResponse(result);
});
