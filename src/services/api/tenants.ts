import { supabase } from './supabase';
import { type Membership, type Tenant, type TenantPublic } from '@/types/db';

export type TenantWithRole = TenantPublic & { role: Membership['role'] };

export async function getTenantBySlug(slug: string): Promise<TenantPublic | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, name, timezone, default_locale, brand_color')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyMemberships(): Promise<TenantWithRole[]> {
  // Get the caller's user id; RLS on `memberships` allows tenant admins to
  // see all memberships of their tenants, so we explicitly filter to OWN
  // memberships to avoid the picker showing a tenant once per teammate.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData?.user?.id;
  if (!userId) return [];

  const { data: memberships, error: membershipError } = await supabase
    .from('memberships')
    .select('tenant_id, role')
    .eq('user_id', userId);
  if (membershipError) throw membershipError;
  if (!memberships || memberships.length === 0) return [];

  const tenantIds = memberships.map((m) => m.tenant_id);
  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('id, slug, name, timezone, default_locale, brand_color')
    .in('id', tenantIds);
  if (tenantError) throw tenantError;

  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));
  return memberships
    .map((m) => {
      const tenant = tenantById.get(m.tenant_id);
      if (!tenant) return null;
      return { ...tenant, role: m.role };
    })
    .filter((x): x is TenantWithRole => x !== null);
}

/**
 * Stub — the real implementation lives in the `claim_slug` Edge Function shipped
 * by the implement-tenant-onboarding change. RLS denies direct inserts on
 * `tenants`, so this client-side helper exists only to give callers a typed
 * surface to import against today.
 */
export async function claimSlug(_args: {
  slug: string;
  name: string;
  timezone: string;
  default_locale: 'en' | 'ar';
}): Promise<Tenant> {
  throw new Error(
    'claimSlug() not implemented in this change. Lands in implement-tenant-onboarding via the claim_slug Edge Function.',
  );
}
