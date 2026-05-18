import { headers } from 'next/headers';
import en from '@/locales/en.json';
import ar from '@/locales/ar.json';

export type Locale = 'en' | 'ar';
const SUPPORTED: Locale[] = ['en', 'ar'];

const STRINGS = { en, ar } as const;

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const parts = key.split('.');
  let cursor: unknown = STRINGS[locale];
  for (const p of parts) {
    if (cursor && typeof cursor === 'object' && p in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[p];
    } else {
      cursor = null;
      break;
    }
  }
  let str = typeof cursor === 'string' ? cursor : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v));
    }
  }
  return str;
}

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const langs = header
    .split(',')
    .map((part) => part.trim().split(';')[0]!.toLowerCase().split('-')[0]!);
  for (const code of langs) {
    if (SUPPORTED.includes(code as Locale)) return code as Locale;
  }
  return null;
}

export async function resolveLocale(
  searchParams: { lang?: string | string[] } = {},
  fallback: Locale = 'en',
): Promise<Locale> {
  const raw = Array.isArray(searchParams.lang) ? searchParams.lang[0] : searchParams.lang;
  if (raw && SUPPORTED.includes(raw as Locale)) return raw as Locale;
  const h = await headers();
  return parseAcceptLanguage(h.get('accept-language')) ?? fallback;
}

export function dirOf(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
