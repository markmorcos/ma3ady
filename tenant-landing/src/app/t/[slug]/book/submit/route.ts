import { NextResponse } from 'next/server';
import { publicUrl } from '@/lib/publicUrl';
import { getServiceClient } from '@/lib/supabase';
import { resolveTenantBySlug } from '@/lib/tenant';

type Params = { slug: string };

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const { slug } = await ctx.params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.redirect(publicUrl(req, '/'), 303);
  }

  const form = await req.formData();
  const serviceId = form.get('service_id')?.toString() ?? '';
  const startsAt = form.get('starts_at')?.toString() ?? '';
  const name = form.get('name')?.toString().trim() ?? '';
  const email = form.get('email')?.toString().trim() ?? '';
  const phone = form.get('phone')?.toString().trim() || null;
  const tos = form.get('tos');

  const errBack = (err: string) => {
    const url = publicUrl(req, `/t/${slug}/book`);
    if (serviceId) url.searchParams.set('service', serviceId);
    if (startsAt) url.searchParams.set('starts_at', startsAt);
    url.searchParams.set('err', err);
    return NextResponse.redirect(url, 303);
  };

  if (!serviceId || !startsAt || !name || !email || !tos) {
    return errBack('missing_fields');
  }

  const sb = getServiceClient();
  const { data, error } = await sb.rpc('book_appointment', {
    p_tenant_slug: tenant.slug,
    p_service_id: serviceId,
    p_starts_at: startsAt,
    p_guest_name: name,
    p_guest_email: email,
    p_guest_phone: phone,
  });

  if (error) {
    if (error.message?.includes('slot_taken')) return errBack('slot_taken');
    if (error.message?.includes('slot_unavailable')) return errBack('slot_unavailable');
    return errBack('generic');
  }

  const rows = (data ?? []) as { appointment_id: string; manage_token: string }[];
  if (!rows.length) return errBack('generic');
  const { appointment_id, manage_token } = rows[0]!;

  const url = publicUrl(req, `/t/${slug}/book/confirm`);
  url.searchParams.set('id', appointment_id);
  url.searchParams.set('token', manage_token);
  url.searchParams.set('starts_at', startsAt);
  url.searchParams.set('email', email);
  url.searchParams.set('service', serviceId);
  return NextResponse.redirect(url, 303);
}
