import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { dirOf, type Locale } from '@/lib/locale';
import './globals.css';

export const metadata: Metadata = {
  title: 'ma3ady',
  description: 'Booking, simplified.',
  robots: { index: false, follow: false },
};

async function pickLocale(): Promise<Locale> {
  const h = await headers();
  const al = h.get('accept-language') ?? '';
  const first = al.split(',')[0]?.trim().toLowerCase() ?? '';
  if (first.startsWith('ar')) return 'ar';
  return 'en';
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await pickLocale();
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body>{children}</body>
    </html>
  );
}
