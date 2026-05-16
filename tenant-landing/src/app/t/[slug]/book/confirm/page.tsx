import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AnimatedCheck } from '@/components/AnimatedCheck';
import { QrShare } from '@/components/QrShare';
import { TenantHeader } from '@/components/TenantHeader';
import { env } from '@/lib/env';
import { dirOf, resolveLocale, t, type Locale } from '@/lib/locale';
import { paletteCss } from '@/lib/palette';
import { getAnonClient } from '@/lib/supabase';
import { resolveTenantBySlug } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Booking confirmed',
  robots: { index: false },
};

type Params = { slug: string };
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

  if (!sp.id || !sp.starts_at || !sp.service) {
    redirect(`/t/${slug}`);
  }

  const service = await fetchService(sp.service);
  if (!service) redirect(`/t/${slug}`);

  const startsAt = new Date(sp.starts_at);
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

  // Countdown rendered server-side from now. Updated on each request; not
  // realtime, but informative for the post-booking moment.
  const deltaMs = startsAt.getTime() - Date.now();
  const countdown = (() => {
    if (deltaMs <= 0) return null;
    const totalMinutes = Math.floor(deltaMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours >= 24) return `${Math.floor(hours / 24)}d`;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    return `${minutes}m`;
  })();

  const manageUrl = sp.token
    ? `https://${env.APEX_HOST}/manage/${sp.token}`
    : null;

  const css = paletteCss(tenant.brand_color ?? '#0B6BCB');

  return (
    <div dir={dir} lang={locale}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="container">
        <TenantHeader tenant={tenant} />

        <section className="hero-card">
          <AnimatedCheck size={88} />
          <p className="eyebrow">{t(locale, 'confirm.hero')}</p>
          <h1>{t(locale, 'confirm.title')}</h1>
          {countdown ? (
            <span className="countdown">
              {t(locale, 'confirm.countdown', { value: countdown })}
            </span>
          ) : null}
        </section>

        <section className="card-outlined">
          <p className="t-eyebrow" style={{ margin: '0 0 4px' }}>
            {tenant.name}
          </p>
          <p className="t-headline-sm" style={{ margin: '0 0 12px' }}>
            {service.name}
          </p>
          <dl className="summary-grid">
            <div>
              <dt>{t(locale, 'confirm.dateLabel')}</dt>
              <dd>{display.split(',')[0]?.trim()}</dd>
            </div>
            <div>
              <dt>{t(locale, 'confirm.timeLabel')}</dt>
              <dd>{display.split(',').slice(1).join(',').trim()}</dd>
            </div>
          </dl>
        </section>

        <section style={{ marginBlockStart: 16 }}>
          <p className="t-eyebrow" style={{ margin: '0 0 8px' }}>
            {t(locale, 'confirm.addToCalendar')}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className="chip chip-suggestion" href={gcal} target="_blank" rel="noopener">
              {t(locale, 'confirm.calendarGoogle')}
            </a>
            <a
              className="chip chip-suggestion"
              href={`/t/${slug}/book/confirm/ics?id=${encodeURIComponent(sp.id)}`}
            >
              {t(locale, 'confirm.calendarApple')}
            </a>
            <a
              className="chip chip-suggestion"
              href={`/t/${slug}/book/confirm/ics?id=${encodeURIComponent(sp.id)}`}
            >
              {t(locale, 'confirm.calendarIcal')}
            </a>
          </div>
        </section>

        {manageUrl ? (
          <section className="card-tertiary" style={{ marginBlockStart: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <QrShare value={manageUrl} size={72} color="var(--on-tertiary-container)" />
              <div style={{ flex: 1 }}>
                <p className="t-title-md" style={{ margin: '0 0 4px' }}>
                  {t(locale, 'confirm.shareTitle')}
                </p>
                <p className="t-body-md" style={{ margin: 0, opacity: 0.85 }}>
                  {t(locale, 'confirm.shareBody')}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="card" style={{ marginBlockStart: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span aria-hidden style={{ fontSize: 20 }}>
              ⓘ
            </span>
            <div style={{ flex: 1 }}>
              <p className="t-title-sm" style={{ margin: '0 0 4px' }}>
                {t(locale, 'confirm.policyTitle')}
              </p>
              <p className="t-body-sm muted" style={{ margin: 0 }}>
                {tenant.cancellation_policy ?? t(locale, 'confirm.policyDefault')}
              </p>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gap: 12, marginBlockStart: 16 }}>
          <Link
            className="btn btn-filled btn-full btn-lg"
            href={{
              pathname: `/manage/${sp.token ?? ''}`,
              query: { lang: locale },
            }}
          >
            {t(locale, 'confirm.manageCta')}
          </Link>
          <a className="btn btn-tonal btn-full" href={`ma3ady://manage/${sp.token ?? ''}`}>
            {t(locale, 'confirm.openInApp')}
          </a>
        </div>

        <footer className="site-footer">
          <Link href="/">ma3ady.com</Link>
        </footer>
      </main>
    </div>
  );
}
