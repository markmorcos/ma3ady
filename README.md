# Ma3ady — ميعادي

Multi-tenant appointment booking, mobile-first. Built with Expo + Supabase.

> **Source of truth**: see [`openspec/project.md`](openspec/project.md) before reading code or proposing changes. Pending change proposals live under `openspec/changes/`.

## Status

Pre-implementation. The repository currently contains only the OpenSpec folder. Implementation begins once the Phase 0 change (`setup-monorepo-and-tooling`) is accepted.

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
