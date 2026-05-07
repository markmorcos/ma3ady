import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TenantHeader } from '@/components/TenantHeader';
import { dirOf, resolveLocale, t, type Locale } from '@/lib/locale';
import { getAnonClient } from '@/lib/supabase';
import { resolveTenantBySlug } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
};

type Params = { slug: string };
type SearchParams = { lang?: string | string[]; cancelled?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return { title: 'ma3ady', robots: { index: false } };
  return {
    title: `${tenant.name} · ma3ady`,
    description: `Book an appointment with ${tenant.name}.`,
    openGraph: {
      title: `${tenant.name} · ma3ady`,
      description: `Book an appointment with ${tenant.name}.`,
      type: 'website',
    },
    robots: { index: false, follow: false },
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
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();
  const locale: Locale = await resolveLocale(sp, tenant.default_locale);
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

        {sp.cancelled === '1' ? (
          <div className="banner">{t(locale, 'manage.cancelled')}</div>
        ) : null}

        <section className="hero">
          <div
            className="brand-bar"
            style={{ background: tenant.brand_color ?? undefined }}
          />
          <h1>{tenant.name}</h1>
          <p>{t(locale, 'tagline')}</p>
          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              className="button primary"
              href={{ pathname: `/t/${slug}/book`, query: sp }}
            >
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
                  href={{
                    pathname: `/t/${slug}/book`,
                    query: { ...sp, service: s.id },
                  }}
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
          <Link href="/">ma3ady.com</Link>
        </footer>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
