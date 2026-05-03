import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { i18next, STORAGE_KEY_LANG, type SupportedLocale } from '@/i18n';
import { applyRTL } from '@/i18n/rtl';

export function useLocale(): {
  lang: SupportedLocale;
  setLang: (lang: SupportedLocale) => Promise<void>;
} {
  const { i18n } = useTranslation();
  const lang = (i18n.language as SupportedLocale) ?? 'en';

  const setLang = async (next: SupportedLocale) => {
    if (next === lang) return;
    await AsyncStorage.setItem(STORAGE_KEY_LANG, next);
    await i18next.changeLanguage(next);
    await applyRTL(next);
  };

  return { lang, setLang };
}
