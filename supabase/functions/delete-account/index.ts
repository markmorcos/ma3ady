// delete-account Edge Function (Deno).
//
// GDPR / right-to-be-forgotten endpoint. Verifies the caller's JWT, refuses
// if they are the sole owner of any tenant (would orphan the tenant),
// anonymizes any guest_contacts the user had previously claimed, then calls
// auth.admin.deleteUser which cascades to memberships, push_tokens, etc.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { withLogging } from '../_shared/withLogging.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(
  withLogging('delete-account', async (req: Request) => {
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
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return jsonResponse({ error: 'unauthorized' }, 401);
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Sole-owner check: a user who is the only `owner` of any tenant must
  // transfer ownership before deletion.
  const { data: ownerships, error: ownErr } = await admin
    .from('memberships')
    .select('tenant_id, tenants(slug, name)')
    .eq('user_id', userId)
    .eq('role', 'owner');
  if (ownErr) {
    return jsonResponse({ error: 'ownership_lookup_failed', detail: ownErr.message }, 500);
  }

  const orphanTenants: { slug: string; name: string }[] = [];
  for (const m of ownerships ?? []) {
    const { count } = await admin
      .from('memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('tenant_id', m.tenant_id)
      .eq('role', 'owner')
      .neq('user_id', userId);
    if ((count ?? 0) === 0) {
      const t = (m as any).tenants;
      orphanTenants.push({ slug: t?.slug ?? '', name: t?.name ?? '' });
    }
  }
  if (orphanTenants.length > 0) {
    return jsonResponse(
      { error: 'transfer_ownership_first', tenants: orphanTenants },
      409,
    );
  }

  // Anonymize claimed guest contacts so we don't lose appointment history.
  await admin
    .from('guest_contacts')
    .update({
      name: '__anonymized__',
      phone: null,
      claimed_by_user_id: null,
    })
    .eq('claimed_by_user_id', userId);

  // Cascade-delete the auth user. memberships / push_tokens have ON DELETE
  // CASCADE pointing at auth.users(id).
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return jsonResponse({ error: 'delete_user_failed', detail: delErr.message }, 500);
  }

  return jsonResponse({ deleted: true });
  }),
);
