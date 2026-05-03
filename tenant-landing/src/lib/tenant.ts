import { headers } from 'next/headers';
import { env } from './env';
import { getAnonClient } from './supabase';

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  default_locale: 'en' | 'ar';
  brand_color: string | null;
};

const RESERVED = new Set(['www', 'app', 'auth', 'api', 'admin', 'mail', 'cdn']);

const cache = new Map<string, { tenant: Tenant | null; expiresAt: number }>();
const TTL_MS = 60_000;

export function slugFromHost(host: string | null): string | null {
  if (!host) return null;
  const cleaned = host.split(':')[0]!.toLowerCase();
  if (cleaned === env.APEX_HOST || cleaned.endsWith('.' + env.APEX_HOST) === false) {
    if (env.ALLOW_LOCALHOST_DEMO && (cleaned === 'localhost' || cleaned === '127.0.0.1')) {
      return 'demo';
    }
    if (cleaned === env.APEX_HOST) return null;
    if (!cleaned.endsWith('.' + env.APEX_HOST)) return null;
  }
  const slug = cleaned.replace('.' + env.APEX_HOST, '');
  if (!slug || slug.includes('.')) return null;
  if (RESERVED.has(slug)) return null;
  return slug;
}

export async function resolveTenantBySlug(slug: string): Promise<Tenant | null> {
  const now = Date.now();
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > now) return cached.tenant;

  const sb = getAnonClient();
  const { data, error } = await sb
    .from('tenants')
    .select('id, slug, name, timezone, default_locale, brand_color')
    .eq('slug', slug)
    .maybeSingle();
  const tenant = error || !data ? null : (data as Tenant);
  cache.set(slug, { tenant, expiresAt: now + TTL_MS });
  return tenant;
}

export async function currentTenant(): Promise<Tenant | null> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const slug = slugFromHost(host);
  if (!slug) return null;
  return resolveTenantBySlug(slug);
}
