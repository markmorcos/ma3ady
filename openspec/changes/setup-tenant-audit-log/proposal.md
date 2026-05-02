# Setup tenant audit log

## Why

`appointment_events` (from the `define-services-and-appointments` change) tracks per-appointment lifecycle. It does NOT cover everything else that happens inside a tenant: who invited whom, who changed a service, who edited availability rules, who promoted whom to admin, who renamed the tenant. When something goes wrong ("why is my schedule different?"), the only trail today is git-style PR diffs on tenant data — there isn't one.

This change adds a tenant-wide audit trail with a uniform shape, automatic triggers on the relevant tables, and an admin UI to browse it.

## What Changes

- **ADDED** migration `010_tenant_audit_events.sql`:
  - `tenant_audit_event_kind enum`: full list below
  - `tenant_audit_events(id, tenant_id, kind, by_user_id nullable, by_kind enum('user','system','guest_token'), target_kind text, target_id uuid nullable, payload jsonb, created_at)`
  - Indexes: `(tenant_id, created_at desc)`, `(by_user_id, created_at desc)`, `(target_kind, target_id)`
  - RLS: insert by SECURITY DEFINER trigger only; select by owner/admin of `tenant_id`; staff sees only `target_kind in ('appointment')` (limited)
- **ADDED** triggers writing to `tenant_audit_events`:
  - `tenants`: `after update of name, timezone, default_locale, brand_color`
  - `memberships`: `after insert / after delete / after update of role`
  - `services`: `after insert / after delete / after update`
  - `availability_rules`: `after insert / after delete / after update`
  - `availability_exceptions`: `after insert / after delete / after update`
  - `pending_memberships`: `after insert / after delete`
- **ADDED** `tenant_audit_event_kind` values:
  - `tenant.updated`
  - `member.invited`, `member.added`, `member.role_changed`, `member.removed`
  - `service.created`, `service.updated`, `service.deactivated`, `service.activated`
  - `availability_rule.created`, `availability_rule.updated`, `availability_rule.deleted`
  - `availability_exception.created`, `availability_exception.deleted`
- **ADDED** `app/(admin)/audit-log.tsx` — admin tab (or sub-route under settings):
  - Reverse-chronological list of events with iconography by `kind`
  - Filter by actor (user), target (service/rule/etc.), date range
  - Tap → detail view showing payload diff
- **ADDED** `src/services/api/audit.ts` — typed wrappers (`getTenantAuditEvents(tenantId, filters)`)
- **ADDED** retention: `tenant_audit_events` rows older than 24 months purged via `pg_cron` daily
- **ADDED** integration with `client_errors` from the `setup-observability` change: each audit event log message references the `request_id` of the Edge Function that triggered it (when applicable, threaded via session-level Postgres GUC `app.request_id`)

## Impact

- Affects `audit-log` capability (initial spec).
- Adds a new admin tab — a delta on the `implement-admin-mobile-dashboard` change's tab set.
- Closes the loop on the "audit row is written (deferred)" TODO in the `implement-admin-mobile-dashboard` change.
- Required for compliance-friendly tenant operations and incident triage.
