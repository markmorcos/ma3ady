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

/**
 * Read the body of a FunctionsHttpError so the caller can see the actual
 * Edge Function failure code + Postgres detail instead of the generic
 * "Edge Function returned a non-2xx status code" message that supabase-js
 * surfaces by default.
 */
async function readEdgeError(
  err: unknown,
): Promise<{ code: string | null; detail: string | null }> {
  // FunctionsHttpError.context is the underlying Response.
  const ctx = (err as { context?: Response } | null)?.context;
  if (!ctx || typeof ctx.json !== 'function') return { code: null, detail: null };
  try {
    const body = (await ctx.json()) as { error?: string; detail?: string };
    return { code: body.error ?? null, detail: body.detail ?? null };
  } catch {
    return { code: null, detail: null };
  }
}

export async function claimSlug(input: ClaimSlugInput): Promise<Tenant> {
  const { data, error } = await supabase.functions.invoke<{ tenant: Tenant; error?: string }>(
    'claim-slug',
    { body: input },
  );
  if (error) {
    const { code, detail } = await readEdgeError(error);
    if (code === 'slug_taken') throw new SlugTakenError();
    if (code === 'slug_reserved') throw new SlugReservedError();
    // Fall back to the legacy substring check on the high-level message
    // for older Edge Function versions that don't return a structured body.
    const msg = (error as Error).message ?? '';
    if (msg.includes('slug_taken')) throw new SlugTakenError();
    if (msg.includes('slug_reserved')) throw new SlugReservedError();
    // Re-throw with the actual code + detail so the UI / logs surface the
    // real failure (e.g. tenant_insert_failed: column "type" does not exist
    // when migration 023 hasn't been applied).
    const combined =
      code && detail ? `${code}: ${detail}` : code ?? detail ?? msg ?? 'unknown';
    throw new Error(combined);
  }
  if (!data?.tenant) throw new Error('claim-slug returned no tenant');
  return data.tenant;
}
