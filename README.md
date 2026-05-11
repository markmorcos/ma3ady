# Ma3ady — ميعادي

Multi-tenant appointment booking, mobile-first. Built with Expo + Supabase.

> **Source of truth**: see [`openspec/project.md`](openspec/project.md) before reading code or proposing changes. Pending change proposals live under `openspec/changes/`.

## Status

All v1 capabilities have landed. Daily development now runs on an **Expo dev client** (`expo-notifications` and other native modules require it; the legacy Expo Go path no longer boots the full feature set).

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

# Build a dev client once per device (EAS), then iterate locally
make build-dev-ios       # or: make build-dev-android
make expo-start-dev-client
```

`make expo-start` (plain Expo Go) is retained for quick UI-only spot checks but skips native-module surfaces (push, splash native config, etc.).

See [`secrets/README.md`](secrets/README.md) for where each secret comes from and how rotation works. `secrets/secrets.local.toml` is gitignored — never commit it.

To fan secrets out to a target environment:

```bash
make secrets-sync ENV=preview
make secrets-sync ENV=production
make secrets-audit            # read-only drift check
```

## Conventions

- Spec-driven: every behavior is described in `openspec/specs/<capability>/spec.md` (or proposed in `openspec/changes/<slug>/specs/<capability>/spec.md`) before implementation.
- Dev-client-first: daily dev runs on an EAS-built dev client (`make expo-start-dev-client`). Native modules (`expo-notifications`, native splash) are linked in.
- Locales: en + ar only.
- Auth: Supabase Google OAuth only.

## Reading order for first-time contributors

1. `openspec/project.md` — architectural source of truth.
2. `openspec/changes/` — pending proposals; pick the one tagged for the current phase.
3. The proposal's `design.md` and the `specs/<capability>/spec.md` deltas.
4. `tasks.md` for the actionable checklist.
