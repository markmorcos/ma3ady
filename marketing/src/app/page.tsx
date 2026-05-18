import type { Metadata } from 'next';
import { MarketingHome } from '@/components/MarketingHome';
import { env } from '@/lib/env';

export const dynamic = 'force-static';

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
