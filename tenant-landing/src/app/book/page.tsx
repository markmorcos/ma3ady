import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { BookingForm } from '@/components/BookingForm';
import { SlotPicker } from '@/components/SlotPicker';
import { TenantHeader } from '@/components/TenantHeader';
import { env } from '@/lib/env';
import { dirOf, resolveLocale, t, type Locale } from '@/lib/locale';
import { getAnonClient } from '@/lib/supabase';
import { currentTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

type SearchParams = {
  service?: string;
  starts_at?: string;
  lang?: string;
  err?: string;
};

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await currentTenant();
  if (!tenant) return { title: 'ma3ady', robots: { index: false } };
  return {
    title: `${tenant.name} · Book · ma3ady`,
  };
}

async function fetchService(id: string) {
  const sb = getAnonClient();
  const { data } = await sb
    .from('services')
    .select('id, name, description, duration_minutes')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tenant = await currentTenant();
  if (!tenant) redirect('/');

  const locale: Locale = await resolveLocale(params, tenant.default_locale);
  const dir = dirOf(locale);

  const serviceId = params.service ?? null;
  const service = serviceId ? await fetchService(serviceId) : null;
  const startsAt = params.starts_at ?? null;

  const slotLabels = {
    morning: t(locale, 'book.morning'),
    afternoon: t(locale, 'book.afternoon'),
    evening: t(locale, 'book.evening'),
    noSlots: t(locale, 'book.noSlots'),
    tryNextWeek: t(locale, 'book.tryNextWeek'),
    chooseSlot: t(locale, 'book.chooseSlot'),
    tenantTimezone: t(locale, 'book.tenantTimezone'),
    yourTimezone: t(locale, 'book.yourTimezone'),
  };

  const formLabels = {
    name: t(locale, 'book.name'),
    email: t(locale, 'book.email'),
    phone: t(locale, 'book.phone'),
    notes: t(locale, 'book.notes'),
    tos: t(locale, 'book.tos'),
    submit: t(locale, 'book.submit'),
    submitBusy: t(locale, 'book.submitBusy'),
  };

  return (
    <div dir={dir} lang={locale}>
      <main className="container">
        <TenantHeader tenant={tenant} />

        <h1 style={{ fontSize: 24, marginTop: 0 }}>
          {t(locale, 'book.pageTitle', { tenantName: tenant.name })}
        </h1>
        <p className="muted">{t(locale, 'book.intro')}</p>

        {params.err === 'slot_taken' || params.err === 'slot_unavailable' ? (
          <div className="banner warning">{t(locale, 'book.slotTaken')}</div>
        ) : null}

        {!service ? (
          <div className="card">
            <p>{t(locale, 'book.needService')}</p>
            <Link className="button primary" href={{ pathname: '/', query: params }}>
              ←
            </Link>
          </div>
        ) : !startsAt ? (
          <section className="card">
            <h2 className="section-title">
              {t(locale, 'book.service')} · {service.name}
            </h2>
            <SlotPicker
              tenantSlug={tenant.slug}
              serviceId={service.id}
              durationMinutes={service.duration_minutes}
              tenantTimezone={tenant.timezone}
              locale={locale}
              supabaseUrl={env.SUPABASE_URL}
              supabaseAnonKey={env.SUPABASE_ANON_KEY}
              labels={slotLabels}
            />
          </section>
        ) : (
          <>
            <section className="card">
              <h2 className="section-title">{t(locale, 'book.service')}</h2>
              <p style={{ margin: 0, fontWeight: 600 }}>{service.name}</p>
              <p className="muted" style={{ margin: 0 }}>
                {new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-GB', {
                  timeZone: tenant.timezone,
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(startsAt))}
              </p>
            </section>

            <section className="card">
              <h2 className="section-title">{t(locale, 'book.yourDetails')}</h2>
              <BookingForm
                action="/book/submit"
                serviceId={service.id}
                startsAt={startsAt}
                labels={formLabels}
              />
            </section>
          </>
        )}

        <footer className="site-footer">
          <a href={`https://${process.env.APEX_HOST ?? 'ma3ady.com'}/`}>ma3ady.com</a>
        </footer>
      </main>
    </div>
  );
}

