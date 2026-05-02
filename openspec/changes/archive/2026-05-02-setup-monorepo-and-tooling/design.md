# Design

## Context

Ma3ady is a fresh Expo app. We need to lock conventions before writing application code. The reference is `markmorcos/stminaconnect`, with three deliberate deviations: pnpm (not npm), Expo SDK 55 (not 51), single-root layout (no `packages/` yet).

## Goals

- New developer can clone, run `make install && make dev-up && make expo-start`, and see a working app in Expo Go in under 10 minutes.
- Lint + typecheck + tests run in CI without flakiness.
- Husky pre-commit catches the obvious mistakes (broken imports, type errors).
- The directory layout matches stminaconnect exactly (`app/` for routes, `src/` for everything else, `@/` alias) so future developers familiar with that codebase get oriented immediately.

## Non-Goals

- Real monorepo with multiple apps. Deferred until we extract shared packages.
- Real CI workflows. Those land in the `setup-deployment-pipelines` change (`setup-deployment-pipelines`).
- Real Supabase wiring. Lands in the `setup-supabase-foundations` change.
- Real i18n / design system. Land in changes 03 + 04.
- Native dev client. Deferred to phase 9 per the Expo Go-first constraint.

## Decisions

1. **pnpm over npm**. Faster installs, stricter dep resolution, workspace-ready for when we extract shared packages. stminaconnect's npm choice was a one-time-migration cost we're not paying again.
2. **Single root, no `packages/` yet**. Premature structure. We add `packages/` when we have the second consumer (e.g., a tenant-landing app sharing the i18n bundle). Until then the cost outweighs the benefit.
3. **Expo Router v5 with route groups**. `(app)`, `(auth)`, `(public)`, `(admin)` — last three land in later changes.
4. **`@/` alias to `src/`**, no other aliases. Discourages import clutter.
5. **Flat ESLint config (`eslint.config.js`)**. v9 standard, easier to read, no `.eslintrc` legacy.
6. **`Makefile` as the daily-commands surface**. Mirrors stminaconnect; Mark already has muscle memory for `make dev-up`, `make migrate-new NAME=...`, etc.
7. **No inline hex in components — lint rule**. Forces every color through the design tokens established in the `setup-design-system` change.
8. **`/dev/*` routes are part of the app shell from day one**. Gated by env var. Cheaper than retrofitting later, useful for debugging during development of every subsequent change.
9. **Production EAS profile asserts dispatcher env vars are `real`**. Build-time guard so we can't accidentally ship a build that talks to mock notification surfaces.

## Implementation Notes (post-apply)

Two deltas between the proposal and what actually got installed — both forced by Expo SDK 55's pinned peer set:

- **RN 0.83.6 / TS 5.9.3** (proposal said "RN 0.81 / TS 5.6"). Expo SDK 55 ships with `react-native@0.83.x` and pulls TS 5.9 via `expo install`. Forcing the older versions would break SDK 55 compatibility, so the SDK-compatible versions are canonical going forward.
- **Babel preset only** — `babel.config.js` uses `babel-preset-expo` with no plugins. Since SDK 50 the `expo-router/babel` plugin was merged into the preset; adding it explicitly emits a deprecation warning. Future changes should not re-add it.

Other minor adjustments:
- ESLint pinned to `^9` (latest is `10.x` but `eslint-config-expo` peers on 8/9).
- Jest pinned to `^29` (latest is `30.x` but `jest-expo`'s `jest-watch-typeahead` peers on 27/28/29).
