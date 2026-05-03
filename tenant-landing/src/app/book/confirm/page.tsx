import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { TenantHeader } from '@/components/TenantHeader';
import { dirOf, resolveLocale, t, type Locale } from '@/lib/locale';
import { getAnonClient } from '@/lib/supabase';
import { currentTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Booking confirmed',
  robots: { index: false },
};

type SearchParams = {
  id?: string;
  token?: string;
  starts_at?: string;
  email?: string;
  service?: string;
  lang?: string;
};

async function fetchService(id: string) {
  const sb = getAnonClient();
  const { data } = await sb
    .from('services')
    .select('id, name, duration_minutes')
    .eq('id', id)
    .maybeSingle();
  return data;
}

function googleCalendarUrl(args: {
  title: string;
  startsAt: string;
  endsAt: string;
}): string {
  const fmt = (iso: string) =>
    iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 15) + 'Z';
  const start = new Date(args.startsAt);
  const end = new Date(args.endsAt);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: args.title,
    dates: `${fmt(start.toISOString())}/${fmt(end.toISOString())}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tenant = await currentTenant();
  if (!tenant) redirect('/');
  const locale: Locale = await resolveLocale(params, tenant.default_locale);
  const dir = dirOf(locale);

  if (!params.id || !params.starts_at || !params.service) {
    redirect('/');
  }

  const service = await fetchService(params.service);
  if (!service) redirect('/');

  const startsAt = new Date(params.starts_at);
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);

  const display = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-GB', {
    timeZone: tenant.timezone,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startsAt);

  const gcal = googleCalendarUrl({
    title: `${tenant.name} — ${service.name}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });

  return (
    <div dir={dir} lang={locale}>
      <main className="container">
        <TenantHeader tenant={tenant} />
        <section className="hero text-center">
          <span style={{ fontSize: 56 }}>✓</span>
          <h1>{t(locale, 'confirm.title')}</h1>
          <p className="muted">
            {t(locale, 'confirm.subtitle', { email: params.email ?? '' })}
          </p>
        </section>

        <section className="card">
          <dl className="summary-grid">
            <dt>{t(locale, 'confirm.service')}</dt>
            <dd>{service.name}</dd>
            <dt>{t(locale, 'confirm.when')}</dt>
            <dd>{display}</dd>
            <dt>{t(locale, 'confirm.duration')}</dt>
            <dd>{service.duration_minutes} min</dd>
          </dl>
        </section>

        <section className="card">
          <h2 className="section-title">{t(locale, 'confirm.manageTitle')}</h2>
          <p className="muted" style={{ margin: '0 0 12px' }}>
            {t(locale, 'confirm.manageBody')}
          </p>
          <Link
            className="button primary full"
            href={{
              pathname: `/manage/${params.token ?? ''}`,
              query: { lang: locale },
            }}
          >
            {t(locale, 'confirm.manageCta')}
          </Link>
        </section>

        <section className="card">
          <h2 className="section-title">{t(locale, 'confirm.addToCalendar')}</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a className="button secondary" href={gcal} target="_blank" rel="noopener">
              {t(locale, 'confirm.calendarGoogle')}
            </a>
            <a
              className="button secondary"
              href={`/book/confirm/ics?id=${encodeURIComponent(params.id)}`}
            >
              {t(locale, 'confirm.calendarApple')}
            </a>
          </div>
        </section>

        <section className="card">
          <a className="button secondary full" href={`ma3ady://manage/${params.token ?? ''}`}>
            {t(locale, 'confirm.openInApp')}
          </a>
        </section>

        <footer className="site-footer">
          <a href={`https://${process.env.APEX_HOST ?? 'ma3ady.com'}/`}>ma3ady.com</a>
        </footer>
      </main>
    </div>
  );
}
