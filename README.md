# Ma3ady — ميعادي

Multi-tenant appointment booking, mobile-first. Built with Expo + Supabase.

> **Source of truth**: see [`openspec/project.md`](openspec/project.md) before reading code or proposing changes. Pending change proposals live under `openspec/changes/`.

## Status

Phase 0 in progress. Project shell (Expo SDK 55, pnpm, lint/typecheck/test gates, `/dev/*` debug surface) is on `main`.

## First-time setup

```bash
# Tooling
nvm use 20    # or any node >= 20
corepack enable

# Install
pnpm install

# Secrets — copy the schema then fill in real values
cp secrets/secrets.example.toml secrets/secrets.local.toml
make secrets-validate

# Run
make expo-start
```

See [`secrets/README.md`](secrets/README.md) for where each secret comes from and how rotation works. `secrets/secrets.local.toml` is gitignored — never commit it.

To fan secrets out to a target environment:

```bash
make secrets-sync ENV=preview
make secrets-sync ENV=production
make secrets-audit            # read-only drift check
```

## Conventions

- Spec-driven: every behavior is described in `openspec/specs/<capability>/spec.md` (or proposed in `openspec/changes/<slug>/specs/<capability>/spec.md`) before implementation.
- Expo Go-first: daily dev runs in Expo Go. Native-module work is deferred behind dispatcher mocks until phase 9.
- Locales: en + ar only.
- Auth: Supabase Google OAuth only.

## Reading order for first-time contributors

1. `openspec/project.md` — architectural source of truth.
2. `openspec/changes/` — pending proposals; pick the one tagged for the current phase.
3. The proposal's `design.md` and the `specs/<capability>/spec.md` deltas.
4. `tasks.md` for the actionable checklist.
