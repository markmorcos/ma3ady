# Design

## Context

The pain point: secrets across GitHub, Supabase (per-environment), EAS, and DNS get out of sync. The fix: one master TOML file with explicit destinations and per-key environment scoping; small TS scripts that fan it out via the existing CLIs (`gh`, `supabase`, `eas`).

This is plumbing — the value is in not having to remember "which CLI sets which secret where" and in catching schema drift in CI.

## Goals

- One file edit + one command = secret propagated everywhere it's needed.
- CI catches schema drift (someone added a key to the master without updating the example).
- Validation catches typos / missing keys before any sync runs.
- Read-only audit for "what's actually deployed where right now."
- No new sub-processor (no Doppler / 1Password Secrets Automation / Infisical in v1).

## Non-Goals

- A dynamic secrets manager (HashiCorp Vault, AWS Secrets Manager). Defer; not justified for the team size.
- Encrypted-in-repo secrets (sops, git-crypt). Defer; the `secrets.local.toml` lives only on Mark's machine + offline backup.
- Per-developer secret overrides. v1 has one developer; not a problem.
- Secret rotation on a schedule. Manual rotation procedure documented; automation deferred.

## Decisions

1. **TOML over JSON / YAML / .env**. Hierarchical + supports comments + reasonable mental model. JSON loses comments; YAML's whitespace bites; flat `.env` doesn't express per-environment scoping cleanly.
2. **Master file is gitignored**. Backup lives in a 1Password vault or an `age`-encrypted blob in a separate private repo. The repo never sees plaintext secrets.
3. **`secrets.example.toml` is the schema**. Adding a key requires updating the example; CI enforces. This means the example file is also documentation — comments next to each key explain what it's for.
4. **Per-key environment scoping is in the section header (`[supabase.preview]`)**, not in the key. Easier to read; matches the destination CLI's mental model (`--project-ref <preview-ref>` is per-environment).
5. **Wrap existing CLIs, don't reimplement**. `gh`, `supabase`, `eas` already do the work. Our scripts orchestrate; they don't talk to APIs directly.
6. **Validate before sync**. A typo in the master file shouldn't propagate to half the destinations.
7. **Secrets sync is idempotent and explicit**. Running `make secrets-sync ENV=preview` repeatedly converges to the desired state. We use `--force` flags where supported to reflect the master-as-source-of-truth.
8. **DNS is *listed* in the master but not synced by these scripts**. Cloudflare records are managed manually (low frequency, low risk). The list in `[dns.production]` exists so rotation reviews don't forget to check DNS too. `make dns-check` (in the deployment-pipelines change) verifies the records.
9. **Audit is read-only**. `make secrets-audit` never mutates. It tells you what's drifted; you decide whether to fix master or the destination.
10. **No GitHub OIDC / federated identity in v1**. The Supabase access token is long-lived. Acceptable for a one-developer project; revisit if/when team grows.
