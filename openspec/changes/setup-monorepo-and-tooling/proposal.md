# Setup monorepo and tooling

## Why

Ma3ady is starting from an empty repo. Before any feature work can happen we need: a single-app Expo project (no real monorepo yet — pnpm workspace ready for future apps), a `Makefile` modeled on `markmorcos/stminaconnect`, lint + format + git hooks, Jest configured, and a `/dev/*` debug surface gate.

We deliberately use **pnpm** (stminaconnect uses npm; ma3ady upgrades) and a **single `app/` Expo Router project at the repo root** for v1. A `packages/` workspace is reserved for later (e.g., when extracting a shared types package), but is not introduced now to avoid premature structure.

## What Changes

- **ADDED** `package.json` with pnpm workspace declaration and Expo SDK 55 dependencies
- **ADDED** `pnpm-workspace.yaml` (single root package for now)
- **ADDED** `app.json` and `eas.json` with `development | preview | production` profiles
- **ADDED** `tsconfig.json` with `@/` path alias to `src/`
- **ADDED** `babel.config.js`, `metro.config.js` (default Expo)
- **ADDED** `eslint.config.js` (flat config), `.prettierrc`, `.prettierignore`
- **ADDED** `.husky/pre-commit` running `pnpm lint:fix && pnpm typecheck`
- **ADDED** `Makefile` with `help, install, dev-up, dev-down, migrate-new, migrate-up, seed, expo-start, build-dev-ios, build-dev-android, build-preview, build-prod, lint, typecheck, test`
- **ADDED** `jest.config.js` + `jest.setup.ts` mirroring stminaconnect
- **ADDED** `.env.example` listing every `EXPO_PUBLIC_*` and server secret expected by ma3ady
- **ADDED** `app/_layout.tsx` placeholder, `app/index.tsx` placeholder
- **ADDED** `src/` skeleton: `branding/`, `components/`, `design/`, `features/`, `hooks/`, `i18n/`, `services/`, `state/`, `types/`, `utils/` (each with a `.gitkeep` until populated)
- **ADDED** `/dev/*` route gate via `EXPO_PUBLIC_SHOW_DEV_TOOLS`

## Impact

- Affects `dev-tooling` capability.
- Unblocks every subsequent change. No runtime user-facing behavior yet.
- Sets the conventions all future code must follow (pnpm, path alias, lint rules, Husky gate).
