import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';
import { applyRTL } from './rtl';

export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const STORAGE_KEY_LANG = 'app.lang';

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
} as const;

void i18next.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  interpolation: { escapeValue: false },
  returnNull: false,
});

function isSupported(code: string | null | undefined): code is SupportedLocale {
  return !!code && (SUPPORTED_LOCALES as readonly string[]).includes(code);
}

export async function resolveInitialLocale(): Promise<SupportedLocale> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY_LANG);
  if (isSupported(stored)) return stored;
  const device = Localization.getLocales()?.[0]?.languageCode ?? null;
  if (isSupported(device)) return device;
  const fallback = process.env.EXPO_PUBLIC_DEFAULT_LOCALE;
  if (isSupported(fallback)) return fallback;
  return 'en';
}

export async function bootstrapI18n(): Promise<SupportedLocale> {
  const resolved = await resolveInitialLocale();
  if (i18next.language !== resolved) {
    await i18next.changeLanguage(resolved);
  }
  await applyRTL(resolved);
  return resolved;
}

export { i18next };
