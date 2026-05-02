# Tasks

- [x] 1.1 Run `pnpm init`; set `name: ma3ady`, `private: true`, `engines.node: ">=20"`
- [x] 1.2 Add `pnpm-workspace.yaml` listing `.` (single-root for now)
- [x] 1.3 Install Expo SDK 55 + RN 0.83 + TypeScript 5.9 (versions actually installed; SDK 55's pinned peer set): `pnpm add expo` then `pnpm exec expo install react react-native @types/react typescript`
- [x] 1.4 Install Expo Router v5: `pnpm add expo-router expo-linking expo-constants react-native-screens react-native-safe-area-context`
- [x] 1.5 Install dev tooling: `pnpm add -D eslint prettier husky lint-staged jest jest-expo @testing-library/react-native @types/jest`
- [x] 1.6 Write `app.json` with `name`, `slug`, `scheme: "ma3ady"`, `ios.bundleIdentifier: "com.ma3ady.app"`, `android.package: "com.ma3ady.app"`, splash + icon paths
- [x] 1.7 Write `eas.json` with `development`, `preview`, `production` profiles; production profile requires `EXPO_PUBLIC_*_DISPATCHER=real`
- [x] 1.8 Write `tsconfig.json` extending `expo/tsconfig.base`, paths `{"@/*": ["src/*"]}`
- [x] 1.9 Write `babel.config.js` with `babel-preset-expo` only (the `expo-router/babel` plugin was merged into the preset in SDK 50; adding it explicitly emits a deprecation warning)
- [x] 1.10 Write `metro.config.js` (default Expo, prepared for SVG support later)
- [x] 1.11 Write `eslint.config.js` (flat config) with `expo` preset + project-specific rules (no inline hex, prefer `@/` over relative deep paths)
- [x] 1.12 Write `.prettierrc` (`semi: true`, `singleQuote: true`, `printWidth: 100`, `trailingComma: "all"`)
- [x] 1.13 Write `.prettierignore`
- [x] 1.14 `pnpm exec husky init`; add `.husky/pre-commit` running `pnpm lint:fix && pnpm typecheck`
- [x] 1.15 Write `Makefile` with all targets listed in proposal. The `migrate-new` target implementation:
  ```make
  migrate-new: ## Create a new sequentially-numbered migration. Usage: make migrate-new NAME=add_foo
  	@if [ -z "$(NAME)" ]; then echo "ERROR: NAME=<slug> required"; exit 1; fi
  	@if ! echo "$(NAME)" | grep -qE '^[a-z][a-z0-9_]*$$'; then \
  		echo "ERROR: NAME must match ^[a-z][a-z0-9_]*$$ (lowercase, underscores)"; exit 1; fi
  	@mkdir -p supabase/migrations
  	@last=$$(ls supabase/migrations/ 2>/dev/null | grep -E '^[0-9]{3}_' | sort | tail -1 | grep -oE '^[0-9]{3}'); \
  	next=$$(printf "%03d" $$((10#$${last:-000} + 1))); \
  	file="supabase/migrations/$${next}_$(NAME).sql"; \
  	if [ -e "$$file" ]; then echo "ERROR: $$file already exists"; exit 1; fi; \
  	touch "$$file"; \
  	echo "Created $$file"
  ```
- [x] 1.16 Write `jest.config.js` (preset `jest-expo`, transformIgnorePatterns for RN/Expo deps)
- [x] 1.17 Write `jest.setup.ts` (mock `expo-localization`, `expo-secure-store`, `react-native-reanimated`)
- [x] 1.18 Write `.env.example` with all `EXPO_PUBLIC_*` vars + server-side secret placeholders
- [x] 1.19 Write `app/_layout.tsx` (Stack root with Theme + I18n providers — providers stubbed, real impls land in later changes)
- [x] 1.20 Write `app/index.tsx` (placeholder home)
- [x] 1.21 Create `src/` subdirs each with a `.gitkeep`
- [x] 1.22 Add `/dev/_layout.tsx` and `/dev/index.tsx` gated behind `EXPO_PUBLIC_SHOW_DEV_TOOLS === '1'`
- [x] 1.23 Verify `pnpm lint` passes on the empty repo
- [x] 1.24 Verify `pnpm typecheck` passes
- [x] 1.25 Verify `pnpm test` runs (no tests yet, exits 0 with `--passWithNoTests`)
- [x] 1.26 Verify Husky pre-commit fires and blocks a bad commit
