import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { env } from '@/lib/env';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Privacy — ma3ady',
  description:
    "How ma3ady collects, stores, and uses data. We don't sell anything to anyone.",
  alternates: {
    canonical: `https://${env.APEX_HOST}/en/privacy/`,
    languages: {
      en: `https://${env.APEX_HOST}/en/privacy/`,
      ar: `https://${env.APEX_HOST}/ar/privacy/`,
    },
  },
};

export default function PrivacyEn() {
  return (
    <LegalPage locale="en" kind="privacy" title="Privacy" updated="2026-05-04">
      <p>
        ma3ady is a booking app. We collect the minimum information needed to
        book and manage appointments. We don&apos;t sell or share data with
        advertisers. This page explains what&apos;s collected and why.
      </p>

      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Booking details</strong>: customer name, email, optional
          phone, the service booked, and the time. Stored against the tenant
          who owns the booking.
        </li>
        <li>
          <strong>Account data</strong> (signed-in users only): name, email,
          profile photo from Google, locale preference.
        </li>
        <li>
          <strong>Telemetry</strong>: app crash reports + Edge Function logs,
          retained for 90 days. No PII in payloads — only stack traces and
          request ids.
        </li>
      </ul>

      <h2>Where it&apos;s stored</h2>
      <p>
        All data lives on Supabase (Postgres + Edge Functions), region EU
        (Frankfurt) by default. Encrypted in transit (TLS 1.2+) and at rest
        (AES-256). Database backups are retained for 30 days.
      </p>

      <h2>Sub-processors</h2>
      <ul>
        <li><strong>Supabase</strong> — database + auth + functions hosting.</li>
        <li><strong>Resend</strong> — transactional email delivery.</li>
        <li><strong>Meta WhatsApp</strong> — booking notifications via WhatsApp Business API.</li>
        <li><strong>Cloudflare</strong> — DNS + CDN + DDoS protection.</li>
        <li><strong>Google</strong> — sign-in (OAuth). We never receive your Google password.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can request export or deletion of your data at any time — email{' '}
        <a href="mailto:hello@ma3ady.com">hello@ma3ady.com</a> from the address
        on your account. Deletion removes your profile and anonymizes your
        past bookings within 30 days. Tenants are obligated to honor these
        requests too.
      </p>

      <h2>Cookies &amp; tracking</h2>
      <p>
        ma3ady doesn&apos;t use third-party trackers. The mobile app uses
        secure local storage only for sign-in tokens and preferences. The
        marketing site uses no cookies at all.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy in a way that materially affects you,
        we&apos;ll email signed-in users and post a banner on{' '}
        <code>ma3ady.com</code> at least 14 days before the change takes
        effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? <a href="mailto:hello@ma3ady.com">hello@ma3ady.com</a>.
      </p>
    </LegalPage>
  );
}
