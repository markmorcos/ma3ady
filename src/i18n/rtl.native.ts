import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { DevSettings, I18nManager } from 'react-native';
import { type SupportedLocale } from './index';

export const RTL_LANGUAGES = new Set<string>(['ar']);

export const STORAGE_KEY_RTL_BOOTSTRAPPED = 'app.rtlBootstrapped';

function shouldBeRTL(lang: SupportedLocale): boolean {
  return RTL_LANGUAGES.has(lang);
}

async function reload() {
  if (__DEV__) {
    DevSettings.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload();
  }
}

/**
 * Bring the React Native layout direction in line with the active language.
 * Reloads the bundle exactly once per direction change. Subsequent boots in
 * the same direction are no-ops.
 */
export async function applyRTL(lang: SupportedLocale): Promise<void> {
  const desiredRTL = shouldBeRTL(lang);
  const stored = await AsyncStorage.getItem(STORAGE_KEY_RTL_BOOTSTRAPPED);

  if (stored === lang && I18nManager.isRTL === desiredRTL) {
    return;
  }

  if (I18nManager.isRTL !== desiredRTL) {
    I18nManager.allowRTL(desiredRTL);
    I18nManager.forceRTL(desiredRTL);
    await AsyncStorage.setItem(STORAGE_KEY_RTL_BOOTSTRAPPED, lang);
    await reload();
    return;
  }

  // direction matched; just record the language so we don't loop next boot
  await AsyncStorage.setItem(STORAGE_KEY_RTL_BOOTSTRAPPED, lang);
}
