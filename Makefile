.PHONY: help install dev-up dev-down migrate-new migrate-up seed test-db expo-start expo-start-dev-client build-dev-ios build-dev-android build-preview build-prod lint typecheck test test-coverage secrets-validate secrets-sync-supabase secrets-sync-eas secrets-sync secrets-audit deploy-migrations deploy-functions deploy-supabase dns-check

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

LOCAL_DB_URL := postgresql://postgres:postgres@127.0.0.1:54322/postgres

seed: ## Seed local DB (supabase/seed.sql)
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/seed.sql

dev-users: ## Create the dev test users (dev-owner / dev-admin / dev-staff / dev-customer @example.com, password: devpassword)
	bash scripts/dev/setup-dev-users.sh

test-db: ## Run all SQL-based DB tests. Requires local Supabase to be up.
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/tenancy.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/availability.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/booking.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/audit.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/onboarding.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/admin.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/availability_rules_grid.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/reschedule_cancel.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/notifications.test.sql
	psql "$(LOCAL_DB_URL)" -v ON_ERROR_STOP=1 -f supabase/tests/observability.test.sql

expo-start: ## Start Expo dev server (Expo Go — UI-only spot checks; lacks native modules)
	pnpm exec expo start

expo-start-dev-client: ## Start Expo dev server with dev client (supported daily flow)
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

secrets-sync-supabase: secrets-validate ## Sync [supabase.<env>] secrets. Usage: SUPABASE_PROJECT_REF=<ref> make secrets-sync-supabase ENV=preview
	@if [ -z "$(ENV)" ]; then echo "ENV=preview|production required"; exit 1; fi
	ENV=$(ENV) pnpm tsx scripts/secrets/sync-supabase.ts

secrets-sync-eas: secrets-validate ## Sync [eas.<env>] env vars to EAS. Usage: make secrets-sync-eas ENV=preview
	@if [ -z "$(ENV)" ]; then echo "ENV=preview|production required"; exit 1; fi
	ENV=$(ENV) pnpm tsx scripts/secrets/sync-eas.ts

secrets-sync: secrets-validate ## Validate then fan out to Supabase + EAS. Usage: SUPABASE_PROJECT_REF=<ref> make secrets-sync ENV=preview
	@if [ -z "$(ENV)" ]; then echo "ENV=preview|production required"; exit 1; fi
	ENV=$(ENV) pnpm tsx scripts/secrets/sync-supabase.ts
	ENV=$(ENV) pnpm tsx scripts/secrets/sync-eas.ts

secrets-audit: ## Read-only diff between master file and deployed secrets
	pnpm tsx scripts/secrets/audit.ts

# -------------------------------------------------------------------
# Supabase deploys (CI canonical; targets exist for local debugging)
# -------------------------------------------------------------------

PROJECT ?= preview

# Edge Functions deployed in lockstep. Keep in sync with deploy-supabase.yml.
SUPABASE_FUNCTIONS := \
	claim-bookings \
	claim-slug \
	delete-account \
	export-my-data \
	manage-appointment \
	update-appointment-status \
	reschedule-appointment \
	send-appointment-notification \
	report-client-error

# Project ref + DB password come from the env (CI sets them per GitHub
# Environment with the unsuffixed names; locally export them in your
# shell before running these targets).
_require-ref:
	@if [ -z "$(SUPABASE_PROJECT_REF)" ]; then \
		echo "ERROR: SUPABASE_PROJECT_REF env var not set" >&2; \
		echo "  CI sets this from the per-environment secret of the same name." >&2; \
		echo "  Locally: export SUPABASE_PROJECT_REF=<ref> before running." >&2; \
		exit 1; \
	fi

_confirm-prod:
	@if [ "$(PROJECT)" = "prod" ] && [ -t 0 ] && [ "$$ASSUME_YES" != "1" ]; then \
		read -p "About to operate on the PROD Supabase project. Continue? [y/N] " ans; \
		if [ "$$ans" != "y" ] && [ "$$ans" != "Y" ]; then echo "Aborted."; exit 1; fi; \
	fi

deploy-migrations: _require-ref ## Push migrations: make deploy-migrations PROJECT=preview|prod
	@$(MAKE) -s _confirm-prod
	@echo "Linking to $(SUPABASE_PROJECT_REF)"
	@pnpm exec supabase link --project-ref $(SUPABASE_PROJECT_REF)
	@echo "Pushing migrations to $(SUPABASE_PROJECT_REF)"
	@pnpm exec supabase db push

deploy-functions: _require-ref ## Deploy Edge Functions: make deploy-functions PROJECT=preview|prod
	@$(MAKE) -s _confirm-prod
	@echo "Linking to $(SUPABASE_PROJECT_REF)"
	@pnpm exec supabase link --project-ref $(SUPABASE_PROJECT_REF)
	@echo "Deploying $(SUPABASE_FUNCTIONS)"
	@pnpm exec supabase functions deploy $(SUPABASE_FUNCTIONS) --project-ref $(SUPABASE_PROJECT_REF)

deploy-supabase: deploy-migrations deploy-functions ## Push migrations + deploy all Edge Functions

# -------------------------------------------------------------------
# DNS sanity check
# -------------------------------------------------------------------

dns-check: ## Verify SPF, DKIM, DMARC records on ma3ady.com
	@bash scripts/dns/dns-check.sh
