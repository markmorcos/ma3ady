// claim-slug Edge Function (Deno).
//
// Atomically claims a tenant slug for a signed-in user: validates input,
// asserts slug availability, inserts the tenants row, inserts the owner
// membership row. Maps slug-collision and reserved-slug failures to clean
// HTTP 409s with stable error codes.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type ClaimInput = {
  slug?: string;
  name?: string;
  timezone?: string;
  default_locale?: string;
  brand_color?: string | null;
};

type Tenant = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  default_locale: string;
  brand_color: string | null;
};

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function isValidIanaZone(z: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: z });
    return true;
  } catch {
    return false;
  }
}

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

  let body: ClaimInput;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const slug = (body.slug ?? '').trim().toLowerCase();
  const name = (body.name ?? '').trim();
  const timezone = (body.timezone ?? '').trim();
  const defaultLocale = (body.default_locale ?? '').trim();
  const brandColor = body.brand_color ? body.brand_color.trim() : null;

  if (!SLUG_RE.test(slug)) return jsonResponse({ error: 'invalid_slug' }, 400);
  if (!name) return jsonResponse({ error: 'invalid_name' }, 400);
  if (!isValidIanaZone(timezone)) return jsonResponse({ error: 'invalid_timezone' }, 400);
  if (defaultLocale !== 'en' && defaultLocale !== 'ar') {
    return jsonResponse({ error: 'invalid_locale' }, 400);
  }
  if (brandColor && !HEX_RE.test(brandColor)) {
    return jsonResponse({ error: 'invalid_brand_color' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Insert the tenant. Catch unique-violation as slug_taken; we'll detect
  // reserved slugs ahead of insertion using the assert helper.
  const { error: assertErr } = await admin.rpc('assert_slug_available', { p_slug: slug });
  if (assertErr) {
    if (assertErr.message?.includes('slug reserved')) {
      return jsonResponse({ error: 'slug_reserved' }, 409);
    }
    if (assertErr.message?.includes('slug taken')) {
      return jsonResponse({ error: 'slug_taken' }, 409);
    }
    if (assertErr.message?.includes('slug invalid')) {
      return jsonResponse({ error: 'invalid_slug' }, 400);
    }
    return jsonResponse({ error: 'assert_failed', detail: assertErr.message }, 500);
  }

  const { data: tenantData, error: tenantErr } = await admin
    .from('tenants')
    .insert({
      slug,
      name,
      timezone,
      default_locale: defaultLocale,
      brand_color: brandColor,
    })
    .select('id, slug, name, timezone, default_locale, brand_color')
    .single();
  if (tenantErr || !tenantData) {
    if (tenantErr?.code === '23505') return jsonResponse({ error: 'slug_taken' }, 409);
    return jsonResponse({ error: 'tenant_insert_failed', detail: tenantErr?.message }, 500);
  }
  const tenant = tenantData as Tenant;

  const { error: memberErr } = await admin.from('memberships').insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: 'owner',
  });
  if (memberErr) {
    // Roll back the tenant we just created so we don't leave orphans.
    await admin.from('tenants').delete().eq('id', tenant.id);
    return jsonResponse({ error: 'membership_insert_failed', detail: memberErr.message }, 500);
  }

  return jsonResponse({ tenant });
});
