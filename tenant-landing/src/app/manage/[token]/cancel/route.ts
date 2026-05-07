import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { publicUrl } from '@/lib/publicUrl';
import { getServiceClient } from '@/lib/supabase';

type Params = { token: string };

// Look up the tenant slug for the appointment behind this token, so we can
// redirect to /t/<slug> after a successful cancel. Best-effort: returns null
// on any failure (token already invalid, appointment missing, RLS error)
// and the caller falls back to the apex.
async function findSlug(token: string): Promise<string | null> {
  try {
    const sb = getServiceClient();
    const { data: appt, error } = await sb.rpc('get_appointment_by_token', {
      p_token: token,
    });
    if (error || !appt) return null;
    const tenantId = (appt as { tenant_id?: string }).tenant_id;
    if (!tenantId) return null;
    const { data: tenant } = await sb
      .from('tenants')
      .select('slug')
      .eq('id', tenantId)
      .maybeSingle();
    return (tenant as { slug?: string } | null)?.slug ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const { token } = await ctx.params;

  // Resolve the slug *before* cancelling — once cancelled, the RPC raises
  // and we lose the slug.
  const slug = await findSlug(token);

  const url = `${env.SUPABASE_URL}/functions/v1/manage-appointment`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ token, action: 'cancel' }),
  });

  if (!res.ok) {
    // Stay on the manage screen so the user can retry / see the error.
    const back = publicUrl(req, `/manage/${token}`);
    back.searchParams.set('error', '1');
    return NextResponse.redirect(back, 303);
  }

  // Success — bounce to the tenant landing (or apex if we couldn't resolve
  // the slug) with a flag the page renders as a cancellation banner.
  const dest = publicUrl(req, slug ? `/t/${slug}` : '/');
  dest.searchParams.set('cancelled', '1');
  return NextResponse.redirect(dest, 303);
}
