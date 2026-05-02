# Setup i18n (en + ar) with RTL

## Why

Ma3ady is bilingual from the first commit. Adding i18n later is always more painful than starting with it. We mirror stminaconnect's approach (i18next + react-i18next + AsyncStorage persistence + RTL bootstrap on first switch) but ship only `en` and `ar` locales — `de` is not in scope.

## What Changes

- **ADDED** dependencies: `i18next`, `react-i18next`, `expo-localization`, `@react-native-async-storage/async-storage`
- **ADDED** `src/i18n/index.ts` — bootstrap module with synchronous EN init at module-load time (so `t()` works in tests) and async `bootstrapI18n()` that resolves the real locale
- **ADDED** `src/i18n/i18next.d.ts` — module augmentation that types `t()` keys
- **ADDED** `src/i18n/locales/en.json` — initial keys for app shell, common buttons, errors
- **ADDED** `src/i18n/locales/ar.json` — full Arabic translation of every English key
- **ADDED** `src/i18n/rtl.ts` — RTL bootstrap helper using `I18nManager.forceRTL` + one-time reload via `expo-updates` (or `DevSettings.reload()` in dev) gated on `AsyncStorage['app.rtlBootstrapped']`
- **ADDED** `src/hooks/useLocale.ts` — read/write locale, exposed via a settings screen later
- **ADDED** AsyncStorage keys: `app.lang`, `app.rtlBootstrapped`
- **MODIFIED** `app/_layout.tsx` — calls `bootstrapI18n()` before rendering, shows splash until ready
- **ADDED** `EXPO_PUBLIC_DEFAULT_LOCALE=en` in `.env.example`

## Impact

- Affects `i18n` capability (initial spec).
- All subsequent UI changes must use `t('key')` — no hardcoded strings.
- RTL implications cascade through the design system (the `setup-design-system` change must use `start`/`end` not `left`/`right`).
