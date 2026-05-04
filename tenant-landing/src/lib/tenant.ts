import { getAnonClient } from './supabase';

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  default_locale: 'en' | 'ar';
  brand_color: string | null;
};

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const RESERVED = new Set([
  // path segments at the apex that must never resolve as a tenant slug
  't',
  'manage',
  'book',
  'en',
  'ar',
  'privacy',
  'terms',
  'sitemap.xml',
  'robots.txt',
  'api',
  'admin',
  'app',
  'auth',
  'manifest.json',
  'apple-app-site-association',
  '.well-known',
]);

const cache = new Map<string, { tenant: Tenant | null; expiresAt: number }>();
const TTL_MS = 60_000;

export function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  if (RESERVED.has(slug)) return false;
  return SLUG_RE.test(slug);
}

export async function resolveTenantBySlug(slug: string): Promise<Tenant | null> {
  if (!isValidSlug(slug)) return null;
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
