import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { env } from '@/lib/env';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Terms — ma3ady',
  description: 'Terms of service for the ma3ady booking app and marketing site.',
  alternates: {
    canonical: `https://${env.APEX_HOST}/en/terms/`,
    languages: {
      en: `https://${env.APEX_HOST}/en/terms/`,
      ar: `https://${env.APEX_HOST}/ar/terms/`,
    },
  },
};

export default function TermsEn() {
  return (
    <LegalPage locale="en" kind="terms" title="Terms of service" updated="2026-05-04">
      <p>
        By using ma3ady you agree to these terms. They&apos;re meant to be
        plain and short. If something is unclear, ask:{' '}
        <a href="mailto:hello@ma3ady.com">hello@ma3ady.com</a>.
      </p>

      <h2>1. Who we are</h2>
      <p>
        ma3ady is a booking application provided by ma3ady (operator details
        in the imprint). We provide the software; tenants (clinics, salons,
        etc.) provide the services you book.
      </p>

      <h2>2. Your account</h2>
      <p>
        You&apos;re responsible for actions taken under your account.
        Don&apos;t share credentials. Tell us immediately if you suspect
        unauthorised access.
      </p>

      <h2>3. Bookings</h2>
      <p>
        ma3ady is the booking surface; the contract for the actual service
        (consultation, haircut, lesson) is between you and the tenant. We
        don&apos;t take payment for tenant services in v1 — money changes
        hands directly between you and the tenant.
      </p>

      <h2>4. Acceptable use</h2>
      <p>
        Don&apos;t use ma3ady to harass others, spam, or abuse rate limits.
        We may suspend or remove accounts that do, with or without notice.
      </p>

      <h2>5. Tenants&apos; obligations</h2>
      <p>
        Tenants agree to honour bookings made on their behalf, deliver
        services as described, and respond to data-deletion requests
        forwarded by ma3ady within a reasonable time.
      </p>

      <h2>6. Pricing</h2>
      <p>
        ma3ady is free during the beta. We&apos;ll give you at least 30 days
        notice before introducing paid plans, and grandfather active users
        into a fair price.
      </p>

      <h2>7. Liability</h2>
      <p>
        ma3ady is provided &quot;as is&quot;. We&apos;re not liable for
        indirect damages. Where the law makes that limitation invalid, our
        maximum liability is capped at the amount you paid us in the previous
        12 months — €0 during the beta.
      </p>

      <h2>8. Termination</h2>
      <p>
        You can stop using ma3ady at any time. We can stop offering it with
        reasonable notice. We&apos;ll preserve your data for 30 days after
        termination so you can export it.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of Germany unless local
        consumer-protection law overrides specific clauses.
      </p>

      <h2>10. Changes</h2>
      <p>
        Material changes are announced 14 days in advance via email and a
        banner on <code>ma3ady.com</code>.
      </p>
    </LegalPage>
  );
}
