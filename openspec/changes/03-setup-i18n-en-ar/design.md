# Design

## Context

Mark wants en + ar from day one. RTL on Android requires `I18nManager.forceRTL(true)` followed by a JS bundle reload — the layout direction is established at app-start and can't be flipped live without a reload. stminaconnect already solved this; we copy the pattern with the locale set narrowed to `['en', 'ar']`.

## Goals

- `t('key')` works in components, hooks, and tests synchronously after the first import.
- Switching language at runtime persists across app launches and triggers RTL flip when going to/from Arabic.
- Translation parity is enforced by a test, not by hope.

## Non-Goals

- Arabic-Indic numerals (defer; western digits are widely accepted in Egypt/UAE/MENA — revisit if a pilot tenant requests them).
- Pluralization with complex Arabic plural forms (i18next handles 6-form plurals, but we'll add specific plural keys only when needed).
- DE/FR/etc. locales.
- Translation management tooling (Lokalise, Crowdin) — defer until we hire a translator.

## Decisions

1. **Synchronous EN init at module load**. So tests and pre-bootstrap render don't crash. Async resolution upgrades the language afterward.
2. **AsyncStorage, not SecureStore, for `app.lang`**. Not sensitive; AsyncStorage is faster for non-secret prefs.
3. **One-time reload gate via `app.rtlBootstrapped`**. Without this, every app start when in Arabic would call `forceRTL` again and re-trigger a reload — infinite loop. The gate ensures at most one reload per direction switch.
4. **`getLocales()[0].languageCode` for first-launch detection**. If the device is set to Arabic (any region), we default to `ar`; otherwise `en`. Honors device preference without a settings screen on first launch.
5. **No locale fallback chain beyond `en`**. Arabic strings must be complete; the parity test enforces it.
6. **`start`/`end` only, no `left`/`right` in styles** — enforced by an ESLint rule added in change 04 (design system). RTL correctness depends on this discipline.
7. **`t()` keys are flat-ish: `namespace.path`**. e.g., `booking.confirm.title`. Two-level nesting max for readability.
