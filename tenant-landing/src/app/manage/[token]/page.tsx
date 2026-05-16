import Link from 'next/link';
import type { Metadata } from 'next';
import { TenantHeader } from '@/components/TenantHeader';
import { dirOf, resolveLocale, t, type Locale } from '@/lib/locale';
import { paletteCss } from '@/lib/palette';
import { getServiceClient } from '@/lib/supabase';
import { type Tenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Manage booking',
  robots: { index: false },
};

type Params = { token: string };
type SearchParams = { lang?: string; cancelled?: string };

async function loadByToken(token: string): Promise<
  | {
      id: string;
      tenant_id: string;
      service_id: string;
      starts_at: string;
      ends_at: string;
      status: string;
    }
  | null
> {
  const sb = getServiceClient();
  const { data, error } = await sb.rpc('get_appointment_by_token', { p_token: token });
  if (error || !data) return null;
  return data as never;
}

async function loadService(id: string) {
  const sb = getServiceClient();
  const { data } = await sb
    .from('services')
    .select('id, name, duration_minutes')
    .eq('id', id)
    .maybeSingle();
  return data;
}

async function loadTenantById(id: string): Promise<Tenant | null> {
  const sb = getServiceClient();
  const { data } = await sb
    .from('tenants')
    .select(
      'id, slug, name, timezone, default_locale, brand_color, type, location, cancellation_policy',
    )
    .eq('id', id)
    .maybeSingle();
  return (data as Tenant | null) ?? null;
}

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { token } = await params;
  const sp = await searchParams;

  const appt = await loadByToken(token);
  const tenant = appt ? await loadTenantById(appt.tenant_id) : null;
  const locale: Locale = await resolveLocale(sp, tenant?.default_locale ?? 'en');
  const dir = dirOf(locale);

  if (!appt || !tenant) {
    return (
      <div dir={dir} lang={locale}>
        <main className="container">
          <div className="empty-state">
            <h1>{t(locale, 'manage.invalidTitle')}</h1>
            <p>{t(locale, 'manage.invalidBody')}</p>
          </div>
        </main>
      </div>
    );
  }
  const service = await loadService(appt.service_id);

  const display = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-GB', {
    timeZone: tenant.timezone,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(appt.starts_at));

  const cancelled = appt.status === 'cancelled' || sp.cancelled === '1';
  const css = paletteCss(tenant.brand_color ?? '#0B6BCB');

  return (
    <div dir={dir} lang={locale}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="container">
        <TenantHeader tenant={tenant} />

        <h1 className="t-headline-sm" style={{ margin: '8px 0 4px' }}>
          {t(locale, 'manage.title')}
        </h1>
        <p className="muted t-body-md" style={{ margin: '0 0 20px' }}>
          {t(locale, 'manage.subtitle')}
        </p>

        {sp.cancelled === '1' ? (
          <div className="banner success">{t(locale, 'manage.cancelled')}</div>
        ) : null}

        <section className="card-primary">
          <p
            className="t-label-md"
            style={{ margin: 0, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            {tenant.name}
          </p>
          <p className="t-headline-sm" style={{ margin: '4px 0 8px' }}>
            {service?.name ?? '—'}
          </p>
          <p className="t-body-md" style={{ margin: 0, opacity: 0.9 }}>
            {display}
          </p>
        </section>

        {!cancelled ? (
          <div style={{ display: 'grid', gap: 12, marginBlockStart: 16 }}>
            <form method="post" action={`/manage/${token}/cancel`}>
              <button type="submit" className="btn btn-danger btn-full btn-lg">
                {t(locale, 'manage.actions.cancel')}
              </button>
            </form>
            <a className="btn btn-tonal btn-full" href={`ma3ady://manage/${token}`}>
              {t(locale, 'confirm.openInApp')}
            </a>
          </div>
        ) : (
          <a
            className="btn btn-tonal btn-full"
            href={`ma3ady://manage/${token}`}
            style={{ marginBlockStart: 16 }}
          >
            {t(locale, 'confirm.openInApp')}
          </a>
        )}

        <footer className="site-footer">
          <Link href="/">←</Link>
        </footer>
      </main>
    </div>
  );
}
