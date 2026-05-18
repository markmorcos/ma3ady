import { type SupportedLocale } from './index';

const RTL_LANGUAGES = new Set<string>(['ar']);

// Web direction flip is cheap: set `document.documentElement.dir` and
// RNW + the browser handle the rest via CSS logical properties. No
// reload, no async storage bookkeeping.
export async function applyRTL(lang: SupportedLocale): Promise<void> {
  if (typeof document === 'undefined') return;
  const dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
}
