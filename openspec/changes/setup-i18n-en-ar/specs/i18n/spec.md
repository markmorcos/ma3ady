# i18n — Spec Delta

## ADDED Requirements

### Requirement: The app SHALL ship `en` and `ar` translation bundles with full parity

`src/i18n/locales/en.json` and `ar.json` SHALL share the exact same set of leaf keys, and a Jest parity test MUST fail any PR that drifts the two files.

#### Scenario: parity check
- **GIVEN** the JSON files at `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`
- **WHEN** the parity Jest test runs
- **THEN** every leaf key present in `en.json` is also present in `ar.json`
- **AND** every leaf key present in `ar.json` is also present in `en.json`
- **AND** the test fails if any key is missing on either side

### Requirement: The locale SHALL persist across app launches

The user's locale choice SHALL be written to `AsyncStorage['app.lang']` immediately, and `bootstrapI18n()` MUST read that value to set `i18next.language` before the first render on subsequent cold starts.

#### Scenario: user picks Arabic
- **GIVEN** an app running in English with no stored preference
- **WHEN** the user opens settings and selects "العربيّة"
- **THEN** `AsyncStorage['app.lang']` is set to `"ar"`
- **AND** `i18next.language` is `"ar"`
- **AND** the next cold start of the app boots in Arabic without prompting

### Requirement: Switching to Arabic SHALL apply RTL layout exactly once per direction change

A locale switch SHALL call `I18nManager.forceRTL(...)` and reload the app exactly once when `AsyncStorage['app.rtlBootstrapped']` differs from the new direction; subsequent boots in the same direction MUST NOT trigger an additional reload.

#### Scenario: first switch to Arabic
- **GIVEN** an app running in English with `AsyncStorage['app.rtlBootstrapped']` unset
- **WHEN** the user switches to Arabic
- **THEN** `I18nManager.forceRTL(true)` is called
- **AND** `AsyncStorage['app.rtlBootstrapped']` is set to `"ar"`
- **AND** the app reloads exactly once (`Updates.reloadAsync()` in production, `DevSettings.reload()` in dev)

#### Scenario: subsequent boot in Arabic
- **GIVEN** the app's next cold start in Arabic
- **WHEN** `bootstrapI18n()` runs
- **THEN** `I18nManager.isRTL === true` already
- **AND** no additional reload is triggered

#### Scenario: switching back to English
- **GIVEN** an app currently in Arabic with `app.rtlBootstrapped === "ar"`
- **WHEN** the user switches to English
- **THEN** `I18nManager.forceRTL(false)` is called
- **AND** `app.rtlBootstrapped` is updated to `"en"`
- **AND** exactly one reload is triggered

### Requirement: Initial locale SHALL respect device preference on first launch

When no stored preference exists, `bootstrapI18n()` SHALL read `expo-localization.getLocales()[0].languageCode` and use it if it matches a supported locale; non-supported codes MUST fall back to `EXPO_PUBLIC_DEFAULT_LOCALE` (`en`).

#### Scenario: device set to Arabic
- **GIVEN** a freshly installed app with no stored preference
- **AND** `expo-localization.getLocales()[0].languageCode === "ar"`
- **WHEN** the app boots
- **THEN** the resolved locale is `"ar"`
- **AND** RTL bootstrap runs

#### Scenario: device set to a non-supported locale
- **GIVEN** a freshly installed app with no stored preference
- **AND** the device locale is `"fr"`
- **WHEN** the app boots
- **THEN** the resolved locale is `"en"` (the fallback declared in `EXPO_PUBLIC_DEFAULT_LOCALE`)

### Requirement: All user-visible strings SHALL come from the i18n bundle

The `i18n/no-literal-string` ESLint rule SHALL fail any multi-word string literal in a `<Text>` child or a `Pressable` `accessibilityLabel`, and the violation MUST be auto-fixable by replacing with `t('...')`.

#### Scenario: lint check for hardcoded strings
- **GIVEN** any component file under `src/components/` or `app/`
- **WHEN** ESLint runs
- **THEN** any string literal in a `<Text>` child or a `Pressable` `accessibilityLabel` that contains more than one whitespace-separated word fails the `i18n/no-literal-string` rule
- **AND** the violation is fixable by replacing with `t('...')`
