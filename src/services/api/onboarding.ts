import { supabase } from './supabase';
import { type SlugAvailability, type Tenant, type TenantType } from '@/types/db';

export type ClaimSlugInput = {
  slug: string;
  name: string;
  timezone: string;
  default_locale: 'en' | 'ar';
  brand_color?: string | null;
  type?: TenantType;
  location?: string | null;
};

export class SlugTakenError extends Error {
  constructor() {
    super('slug_taken');
    this.name = 'SlugTakenError';
  }
}

export class SlugReservedError extends Error {
  constructor() {
    super('slug_reserved');
    this.name = 'SlugReservedError';
  }
}

type RawAvailabilityRow = { available?: boolean; reason?: string | null };

function normalizeAvailability(data: unknown): SlugAvailability {
  // PostgREST's response shape for `returns table(...)` is `[{...}]`, but
  // single-row functions sometimes come back as a single object. Handle both.
  const row: RawAvailabilityRow | null = Array.isArray(data)
    ? ((data[0] as RawAvailabilityRow) ?? null)
    : ((data as RawAvailabilityRow) ?? null);
  if (!row || typeof row.available !== 'boolean') {
    return { available: false, reason: 'invalid' };
  }
  return {
    available: row.available,
    reason: (row.reason as SlugAvailability['reason']) ?? null,
  };
}

export async function checkSlugAvailability(slug: string): Promise<SlugAvailability> {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return { available: false, reason: 'invalid' };
  const { data, error } = await supabase.rpc('check_slug_availability', { p_slug: trimmed });
  if (error) {
    console.warn('[checkSlugAvailability]', error);
    throw error;
  }
  return normalizeAvailability(data);
}

export async function claimSlug(input: ClaimSlugInput): Promise<Tenant> {
  const { data, error } = await supabase.functions.invoke<{ tenant: Tenant; error?: string }>(
    'claim-slug',
    { body: input },
  );
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('slug_taken')) throw new SlugTakenError();
    if (msg.includes('slug_reserved')) throw new SlugReservedError();
    throw error;
  }
  if (!data?.tenant) throw new Error('claim-slug returned no tenant');
  return data.tenant;
}
