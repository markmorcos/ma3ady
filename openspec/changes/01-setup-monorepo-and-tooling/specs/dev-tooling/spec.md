# dev-tooling — Spec Delta

## ADDED Requirements

### Requirement: The repository SHALL be a pnpm workspace with a single root package

#### Scenario: pnpm install
- **GIVEN** a fresh clone of the repo
- **WHEN** a developer runs `pnpm install`
- **THEN** all dependencies install without warnings or peer-dependency errors
- **AND** `node_modules` is created at the workspace root only, not inside `app/` or `src/`

### Requirement: Daily commands SHALL be exposed via `make` targets

#### Scenario: discoverable help
- **GIVEN** a developer runs `make` with no arguments
- **THEN** the output lists every annotated target with its description
- **AND** at minimum the targets `install, dev-up, dev-down, migrate-new, migrate-up, seed, expo-start, expo-start-dev-client, build-dev-ios, build-dev-android, build-preview, build-prod, lint, typecheck, test, test-coverage` are present

#### Scenario: build-prod confirmation
- **GIVEN** a developer runs `make build-prod`
- **WHEN** the target executes
- **THEN** an interactive `read -p` prompt asks for explicit confirmation before invoking `eas build --profile production`
- **AND** declining the prompt aborts the build with a non-zero exit code

### Requirement: TypeScript paths SHALL alias `@/` to `src/`

#### Scenario: import using alias
- **GIVEN** a file in `app/index.tsx`
- **WHEN** it imports `import { Button } from '@/components/Button'`
- **THEN** TypeScript resolves the path to `src/components/Button`
- **AND** Metro bundler resolves the same path at runtime

### Requirement: Husky pre-commit hook SHALL block broken commits

#### Scenario: failing typecheck
- **GIVEN** a staged change that introduces a TypeScript error
- **WHEN** the developer runs `git commit`
- **THEN** the pre-commit hook runs `pnpm typecheck`
- **AND** the commit is rejected with a non-zero exit code
- **AND** the staged changes remain in the index

### Requirement: A `/dev/*` debug surface SHALL exist gated by an env flag

#### Scenario: dev tools hidden by default
- **GIVEN** `EXPO_PUBLIC_SHOW_DEV_TOOLS` is unset or not equal to `'1'`
- **WHEN** the app boots
- **THEN** the `/dev/*` routes return 404 / "not found"

#### Scenario: dev tools visible when enabled
- **GIVEN** `EXPO_PUBLIC_SHOW_DEV_TOOLS='1'` in the environment
- **WHEN** a developer navigates to `/dev`
- **THEN** an index of dev utilities is displayed (database inspector, design-system showcase, locale switcher) — implementations land in later changes

### Requirement: Production EAS profile SHALL assert real dispatchers

#### Scenario: dispatcher mismatch on production build
- **GIVEN** an `eas build --profile production` invocation
- **WHEN** any `EXPO_PUBLIC_*_DISPATCHER` env is not `real`
- **THEN** the build fails before bundling with a clear error message naming the offending variable
