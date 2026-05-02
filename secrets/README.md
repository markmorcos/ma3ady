# Secrets

Single source of truth for every project secret. Edit `secrets.local.toml`, run one command, and the value lands in every destination it belongs in.

## First-time setup

1. Copy the schema:
   ```bash
   cp secrets/secrets.example.toml secrets/secrets.local.toml
   ```
2. Fill in real values — see the **Where each secret comes from** section below.
3. Validate:
   ```bash
   make secrets-validate
   ```
4. Sync to a target environment:
   ```bash
   make secrets-sync ENV=preview
   make secrets-sync ENV=production
   ```

`secrets.local.toml` is gitignored. It must never be committed.

## Where each secret comes from

| Key | Source |
|---|---|
| `[github].INFRASTRUCTURE_DISPATCH_TOKEN` | GitHub PAT with `repo` scope on `markmorcos/infrastructure` |
| `[github].EXPO_TOKEN` | https://expo.dev/accounts/<you>/settings/access-tokens |
| `[github].SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens |
| `[github].SUPABASE_PROJECT_REF_*` | Supabase dashboard → project → Settings → General → Reference ID |
| `[github].SUPABASE_DB_PASSWORD_*` | Set when the project was created; rotate via Settings → Database |
| `[github].GHCR_PUSH_TOKEN` | GitHub PAT with `write:packages` scope |
| `[supabase.*].GOOGLE_CLIENT_*` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs |
| `[supabase.*].RESEND_*` | https://resend.com/api-keys |
| `[supabase.*].WHATSAPP_*` | Meta Business Manager → WhatsApp Cloud API |
| `[supabase.*].*_DISPATCHER` | Either `mock` or `real` — production must be `real`, preview defaults to `mock` |
| `[eas.*].EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard → project → Settings → API → URL |
| `[eas.*].EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → project → Settings → API → anon/public key |

## Rotation

Routine rotation:

1. Edit the affected key(s) in `secrets/secrets.local.toml`.
2. `make secrets-sync ENV=<preview|production>`.
3. Run `make secrets-audit` to confirm no drift remains.
4. Restart the affected service (Supabase Edge Functions auto-pick on next invocation; mobile builds need a fresh EAS build).

Emergency rotation (compromised credential):

1. Revoke the credential at its source (e.g. delete the Resend API key).
2. Generate a fresh credential.
3. Update `secrets.local.toml`.
4. Sync (`make secrets-sync ENV=production` first, then preview).
5. Audit.
6. File an incident note in the audit log.

## Backup

`secrets.local.toml` lives only on the developer machine. Keep an offline copy in:

- A 1Password vault entry, **or**
- An `age`-encrypted blob in a separate private repo.

A future `scripts/secrets/encrypt.ts` and `decrypt.ts` will wrap `age` for the second option; not wired in v1.

## Why TOML

Hierarchical, supports comments, and the per-environment scoping reads cleanly (`[supabase.preview]` vs `[supabase.production]`). JSON loses comments; YAML's whitespace bites; flat `.env` doesn't express scoping at all.
