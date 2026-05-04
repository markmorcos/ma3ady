import type { Metadata } from 'next';
import { MarketingHome } from '@/components/MarketingHome';
import { env } from '@/lib/env';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'ma3ady — الحجز ببساطة',
  description:
    'تطبيق مواعيد ثنائي اللغة للأعمال الصغيرة. عملاؤك يحجزون في ثوانٍ، وأنت تقضي وقتاً أقل على الهاتف.',
  alternates: {
    canonical: `https://${env.APEX_HOST}/ar/`,
    languages: {
      en: `https://${env.APEX_HOST}/`,
      ar: `https://${env.APEX_HOST}/ar/`,
    },
  },
  robots: { index: true, follow: true },
};

export default function ArabicMarketingPage() {
  return <MarketingHome locale="ar" />;
}
