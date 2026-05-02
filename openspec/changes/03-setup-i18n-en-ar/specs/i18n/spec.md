# i18n — Spec Delta

## ADDED Requirements

### Requirement: The app SHALL ship `en` and `ar` translation bundles with full parity

#### Scenario: parity check
- **GIVEN** the JSON files at `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`
- **WHEN** the parity Jest test runs
- **THEN** every leaf key present in `en.json` is also present in `ar.json`
- **AND** every leaf key present in `ar.json` is also present in `en.json`
- **AND** the test fails if any key is missing on either side

### Requirement: The locale SHALL persist across app launches

#### Scenario: user picks Arabic
- **GIVEN** an app running in English with no stored preference
- **WHEN** the user opens settings and selects "العربيّة"
- **THEN** `AsyncStorage['app.lang']` is set to `"ar"`
- **AND** `i18next.language` is `"ar"`
- **AND** the next cold start of the app boots in Arabic without prompting

### Requirement: Switching to Arabic SHALL apply RTL layout exactly once per direction change

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

#### Scenario: lint check for hardcoded strings
- **GIVEN** any component file under `src/components/` or `app/`
- **WHEN** ESLint runs
- **THEN** any string literal in a `<Text>` child or a `Pressable` `accessibilityLabel` that contains more than one whitespace-separated word fails the `i18n/no-literal-string` rule
- **AND** the violation is fixable by replacing with `t('...')`
