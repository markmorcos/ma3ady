# Setup secrets sync — single source of truth + fanout

## Why

This project's secrets live in **four** different destinations: GitHub Actions repo secrets, Supabase project secrets (per-environment), EAS secrets (mobile builds), and DNS records on Cloudflare. Plus per-environment values (preview vs production). Today, populating all of those by hand is error-prone and the state drifts — somebody rotates a Resend key in one place but not another, and emails start failing in preview only.

Per `project.md` §11, this change introduces a single master file (`secrets/secrets.local.toml`, gitignored) and `make` targets that fan it out. Add a key once; type one command to push it everywhere.

## What Changes

- **ADDED** `secrets/` directory:
  - `secrets.example.toml` — committed schema with empty values + comments documenting each key
  - `secrets.local.toml` — gitignored master, populated by Mark
  - `README.md` — how to use, rotation procedure
- **ADDED** `secrets/` is gitignored at the directory level for `secrets.local.toml` (and any `*.local.*`) but NOT the example file
- **ADDED** `scripts/secrets/` TypeScript scripts (run via `pnpm tsx`, no build):
  - `parse.ts` — reads `secrets.local.toml`, validates against `secrets.example.toml` schema, exits non-zero on missing keys
  - `sync-github.ts` — for each `[github]` entry, runs `gh secret set NAME -b VALUE` (or `gh secret set NAME -b VALUE --env <env>` for env-scoped secrets per the schema)
  - `sync-supabase.ts ENV=...` — for each `[supabase.<env>]` entry, runs `supabase secrets set NAME=VALUE --project-ref $REF` against the appropriate project ref
  - `sync-eas.ts ENV=...` — for each `[eas.<env>]` entry, runs `eas secret:create --scope project --name NAME --value VALUE --type string --force` (or `eas env:create`)
  - `validate.ts` — strict schema check; used in CI against the example file to detect schema drift
  - `audit.ts` — read-only: reports which secrets exist in which destinations and flags missing/extra entries
- **ADDED** Makefile targets:
  - `secrets-validate` — runs `parse.ts` against the local file
  - `secrets-sync-github` — runs `sync-github.ts`
  - `secrets-sync-supabase ENV=<preview|production>` — runs `sync-supabase.ts`
  - `secrets-sync-eas ENV=<preview|production>` — runs `sync-eas.ts`
  - `secrets-sync ENV=<env>` — sequentially: validate → github → supabase ENV → eas ENV
  - `secrets-audit` — runs `audit.ts`
- **ADDED** CI step in `ci.yml`: validate `secrets.example.toml` parses and contains every required schema key (does NOT touch `secrets.local.toml`)
- **ADDED** `.gitignore` entry: `secrets/secrets.local.toml`, `secrets/*.local.toml`, `secrets/*.bak`
- **ADDED** `gpg-encrypt` placeholder support: `scripts/secrets/encrypt.ts` and `decrypt.ts` for shared offline backup of the master file via age/gpg (deferred until needed; documented but not wired)
- **ADDED** secret schema covering: GitHub (CI/dispatch tokens, project refs, db passwords), Supabase per-env (Google OAuth, Resend, WhatsApp, dispatcher modes), EAS per-env (Expo public env vars), and a dedicated `[dns]` section listing what records must exist (read by `make dns-check` from the `setup-deployment-pipelines` change)

## Impact

- Affects `dev-tooling` capability (delta).
- Replaces ad-hoc `gh secret set` / `supabase secrets set` / `eas secret:create` invocations elsewhere in tasks (notably the `setup-deployment-pipelines` and `implement-google-oauth` and `implement-notifications-pipeline` changes — those changes still document what keys they need; this change provides the single mechanism).
- One-time setup cost (write the scripts, populate the master file). After that: rotating a secret = edit one TOML key, run one make target.
