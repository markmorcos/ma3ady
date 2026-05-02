.PHONY: help install dev-up dev-down migrate-new migrate-up seed expo-start expo-start-dev-client build-dev-ios build-dev-android build-preview build-prod lint typecheck test test-coverage secrets-validate secrets-sync-github secrets-sync-supabase secrets-sync-eas secrets-sync secrets-audit

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-28s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install

dev-up: ## Start local Supabase
	pnpm exec supabase start

dev-down: ## Stop local Supabase
	pnpm exec supabase stop

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

migrate-up: ## Apply migrations to local Supabase
	pnpm exec supabase db push --local

seed: ## Seed local DB (placeholder)
	@echo "seed target not yet implemented; lands in setup-supabase-foundations"

expo-start: ## Start Expo dev server (Expo Go)
	pnpm exec expo start

expo-start-dev-client: ## Start Expo dev server with dev client
	pnpm exec expo start --dev-client

build-dev-ios: ## EAS build, iOS development profile
	pnpm exec eas build --platform ios --profile development

build-dev-android: ## EAS build, Android development profile
	pnpm exec eas build --platform android --profile development

build-preview: ## EAS build, preview profile
	pnpm exec eas build --profile preview

build-prod: ## EAS build, production profile (requires explicit confirmation)
	@read -p "About to build PRODUCTION. Type 'yes' to continue: " ans; \
	if [ "$$ans" != "yes" ]; then echo "Aborted."; exit 1; fi
	pnpm exec eas build --profile production

lint: ## Run ESLint
	pnpm lint

lint-fix: ## Run ESLint with --fix
	pnpm lint:fix

typecheck: ## TypeScript typecheck
	pnpm typecheck

test: ## Run tests
	pnpm test

test-coverage: ## Run tests with coverage
	pnpm test:coverage

secrets-validate: ## Validate secrets/secrets.local.toml against the schema
	pnpm tsx scripts/secrets/parse.ts

secrets-sync-github: secrets-validate ## Sync [github] secrets to GitHub Actions
	pnpm tsx scripts/secrets/sync-github.ts

secrets-sync-supabase: secrets-validate ## Sync [supabase.<env>] secrets. Usage: make secrets-sync-supabase ENV=preview
	@if [ -z "$(ENV)" ]; then echo "ENV=preview|production required"; exit 1; fi
	ENV=$(ENV) pnpm tsx scripts/secrets/sync-supabase.ts

secrets-sync-eas: secrets-validate ## Sync [eas.<env>] env vars to EAS. Usage: make secrets-sync-eas ENV=preview
	@if [ -z "$(ENV)" ]; then echo "ENV=preview|production required"; exit 1; fi
	ENV=$(ENV) pnpm tsx scripts/secrets/sync-eas.ts

secrets-sync: secrets-validate ## Validate then fan out to GH + Supabase + EAS. Usage: make secrets-sync ENV=preview
	@if [ -z "$(ENV)" ]; then echo "ENV=preview|production required"; exit 1; fi
	pnpm tsx scripts/secrets/sync-github.ts
	ENV=$(ENV) pnpm tsx scripts/secrets/sync-supabase.ts
	ENV=$(ENV) pnpm tsx scripts/secrets/sync-eas.ts

secrets-audit: ## Read-only diff between master file and deployed secrets
	pnpm tsx scripts/secrets/audit.ts
