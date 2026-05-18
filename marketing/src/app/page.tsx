import type { Metadata } from 'next';
import { MarketingHome } from '@/components/MarketingHome';
import { env } from '@/lib/env';

// The page itself is static content, but it reads runtime env via
// `env.WEB_APP_HOST` to build the demo CTA (`https://app.ma3ady.com` on
// prod, `https://preview-app.ma3ady.com` on preview). `force-static`
// snapshots `process.env.*` at build time — wrong for preview because
// the Dockerfile builds without env. `force-dynamic` re-renders per
// request on the running pod so the manifest's env is honored.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ma3ady — Booking, simplified',
  description:
    'A bilingual appointment app for small businesses. Customers book in seconds; you spend less time on the phone.',
  openGraph: {
    title: 'ma3ady — Booking, simplified',
    description: 'Bilingual booking for clinics, salons, tutors and service pros.',
    type: 'website',
    url: `https://${env.APEX_HOST}/`,
  },
  alternates: {
    canonical: `https://${env.APEX_HOST}/`,
    languages: {
      en: `https://${env.APEX_HOST}/`,
      ar: `https://${env.APEX_HOST}/ar/`,
    },
  },
  robots: { index: true, follow: true },
};

export default function Home() {
  return <MarketingHome locale="en" />;
}
