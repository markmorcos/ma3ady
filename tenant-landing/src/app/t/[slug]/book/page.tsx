import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BookingForm } from '@/components/BookingForm';
import { SlotPicker } from '@/components/SlotPicker';
import { TenantHeader } from '@/components/TenantHeader';
import { env } from '@/lib/env';
import { dirOf, resolveLocale, t, type Locale } from '@/lib/locale';
import { paletteCss } from '@/lib/palette';
import { getAnonClient } from '@/lib/supabase';
import { resolveTenantBySlug } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

type Params = { slug: string };
type SearchParams = {
  service?: string;
  starts_at?: string;
  lang?: string;
  err?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return { title: 'ma3ady', robots: { index: false } };
  return {
    title: `${tenant.name} · Book · ma3ady`,
    robots: { index: false, follow: false },
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
  const dir = dirOf(locale);

  const serviceId = sp.service ?? null;
  const service = serviceId ? await fetchService(serviceId) : null;
  const startsAt = sp.starts_at ?? null;

  const slotLabels = {
    morning: t(locale, 'book.morning'),
    afternoon: t(locale, 'book.afternoon'),
    evening: t(locale, 'book.evening'),
    noSlots: t(locale, 'book.noSlots'),
    tryNextWeek: t(locale, 'book.tryNextWeek'),
    chooseSlot: t(locale, 'book.chooseSlot'),
    tenantTimezone: t(locale, 'book.tenantTimezone'),
    yourTimezone: t(locale, 'book.yourTimezone'),
    scanHint: t(locale, 'book.scanHint'),
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

  const css = paletteCss(tenant.brand_color ?? '#0B6BCB');

  return (
    <div dir={dir} lang={locale}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="container">
        <TenantHeader tenant={tenant} />

        <h1 className="t-headline-sm" style={{ margin: '8px 0 4px' }}>
          {t(locale, 'book.pageTitle', { tenantName: tenant.name })}
        </h1>
        <p className="muted t-body-md" style={{ margin: '0 0 20px' }}>
          {t(locale, 'book.intro')}
        </p>

        {sp.err === 'slot_taken' || sp.err === 'slot_unavailable' ? (
          <div className="banner warning">{t(locale, 'book.slotTaken')}</div>
        ) : null}

        {!service ? (
          <div className="card">
            <p className="t-body-md">{t(locale, 'book.needService')}</p>
            <Link
              className="btn btn-filled"
              href={{ pathname: `/t/${slug}`, query: sp }}
            >
              {t(locale, 'book.back')}
            </Link>
          </div>
        ) : !startsAt ? (
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
        ) : (
          <>
            <div className="card-primary">
              <p
                className="t-label-md"
                style={{
                  margin: 0,
                  opacity: 0.8,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {tenant.name}
              </p>
              <p className="t-headline-sm" style={{ margin: '4px 0 8px' }}>
                {service.name}
              </p>
              <p className="t-body-md" style={{ margin: 0, opacity: 0.9 }}>
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
            </div>

            <div className="card" style={{ marginBlockStart: 12 }}>
              <h2 className="t-eyebrow" style={{ margin: '0 0 12px' }}>
                {t(locale, 'book.yourDetails')}
              </h2>
              <BookingForm
                action={`/t/${slug}/book/submit`}
                serviceId={service.id}
                startsAt={startsAt}
                labels={formLabels}
              />
            </div>
          </>
        )}

        <footer className="site-footer">
          <Link href="/">ma3ady.com</Link>
        </footer>
      </main>
    </div>
  );
}

