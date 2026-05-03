import Link from 'next/link';
import type { Metadata } from 'next';
import { TenantHeader } from '@/components/TenantHeader';
import { dirOf, resolveLocale, t, type Locale } from '@/lib/locale';
import { getAnonClient } from '@/lib/supabase';
import { currentTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
};

type SearchParams = { lang?: string | string[] };

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await currentTenant();
  if (!tenant) return { title: 'ma3ady', robots: { index: false } };
  return {
    title: `${tenant.name} · ma3ady`,
    description: `Book an appointment with ${tenant.name}.`,
    openGraph: {
      title: `${tenant.name} · ma3ady`,
      description: `Book an appointment with ${tenant.name}.`,
      type: 'website',
    },
  };
}

async function fetchActiveServices(tenantId: string): Promise<Service[]> {
  const sb = getAnonClient();
  const { data } = await sb
    .from('services')
    .select('id, name, description, duration_minutes')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('name');
  return (data ?? []) as Service[];
}

export default async function TenantLanding({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tenant = await currentTenant();
  const locale: Locale = await resolveLocale(params, tenant?.default_locale ?? 'en');

  if (!tenant) {
    return (
      <div dir={dirOf(locale)} lang={locale}>
        <main className="container">
          <div className="empty-state">
            <h1>{t(locale, 'errors.tenantNotFound')}</h1>
            <p>{t(locale, 'errors.tenantNotFoundBody')}</p>
          </div>
        </main>
      </div>
    );
  }

  const services = await fetchActiveServices(tenant.id);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: tenant.name,
    timezone: tenant.timezone,
  };

  return (
    <div dir={dirOf(locale)} lang={locale}>
      <main className="container">
        <TenantHeader tenant={tenant} />

        <section className="hero">
          <div className="brand-bar" style={{ background: tenant.brand_color ?? undefined }} />
          <h1>{tenant.name}</h1>
          <p>{t(locale, 'tagline')}</p>
          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="button primary" href={{ pathname: '/book', query: params }}>
              {locale === 'ar' ? 'احجز الآن' : 'Book now'}
            </Link>
            <a className="button secondary" href={`ma3ady://${tenant.slug}`}>
              {t(locale, 'openInApp')}
            </a>
          </div>
        </section>

        {services.length > 0 ? (
          <section className="card">
            <h2 className="section-title">{t(locale, 'available.title')}</h2>
            <p className="muted" style={{ margin: '0 0 12px' }}>
              {t(locale, 'available.subtitle')}
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {services.map((s) => (
                <Link
                  key={s.id}
                  className="service-card"
                  href={{ pathname: '/book', query: { ...params, service: s.id } }}
                >
                  <p className="name">{s.name}</p>
                  <p className="duration">
                    {t(locale, 'available.duration', { duration: s.duration_minutes })}
                    {s.description ? ` · ${s.description}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="site-footer">
          <a href={`https://${process.env.APEX_HOST ?? 'ma3ady.com'}/`}>ma3ady.com</a>
        </footer>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
