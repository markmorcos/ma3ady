# audit-log Specification

## Purpose
TBD - created by archiving change setup-tenant-audit-log. Update Purpose after archive.
## Requirements
### Requirement: Every meaningful tenant-level mutation SHALL produce an audit event

DB triggers on `tenants`, `memberships`, `services`, `availability_rules`, and `availability_exceptions` SHALL insert a `tenant_audit_events` row capturing `kind`, `target_kind`, `target_id`, before/after payload, and `by_user_id`; the row MUST commit in the same transaction as the underlying mutation so audit history cannot drift.

#### Scenario: tenant settings update
- **GIVEN** an owner updates `tenants.timezone` from `Europe/Berlin` to `Europe/Paris`
- **WHEN** the UPDATE commits
- **THEN** a `tenant_audit_events` row is inserted with `kind = 'tenant.updated', target_kind = 'tenant', target_id = <tenant_id>, payload.columns_changed = ['timezone'], payload.before.timezone = 'Europe/Berlin', payload.after.timezone = 'Europe/Paris', by_user_id = <owner>`

#### Scenario: member role change
- **GIVEN** an owner promotes a `staff` member to `admin`
- **WHEN** the membership row updates
- **THEN** a row is inserted with `kind = 'member.role_changed', payload = {from: 'staff', to: 'admin'}, target_kind = 'membership', target_id = <membership_id>, by_user_id = <owner>`

#### Scenario: service edit
- **GIVEN** an admin updates a service's duration
- **WHEN** the UPDATE commits
- **THEN** a row is inserted with `kind = 'service.updated', target_kind = 'service', target_id = <service_id>, payload.columns_changed = ['duration_minutes']`

#### Scenario: rules bulk replace
- **GIVEN** an admin replaces all Monday bands via `bulk_replace_rules_for_day`
- **WHEN** the function runs (delete + insert in transaction)
- **THEN** N delete and M insert audit rows are produced (one per affected `availability_rules` row)
- **AND** they share the same `request_id` in their payloads, allowing the admin UI to group them

### Requirement: Audit events SHALL be immutable from application code

RLS on `tenant_audit_events` SHALL deny UPDATE and DELETE for every role; rows MUST only ever be removed by the scheduled retention purge running with elevated privileges.

#### Scenario: update attempt
- **GIVEN** any caller (admin or otherwise) attempts `update tenant_audit_events set kind = '...' where id = '...'`
- **WHEN** the operation runs
- **THEN** RLS denies the update
- **AND** zero rows are affected

#### Scenario: delete attempt by admin
- **GIVEN** an admin attempts `delete from tenant_audit_events`
- **WHEN** the operation runs
- **THEN** RLS denies the delete
- **AND** the only path that removes rows is the scheduled retention purge running with elevated privileges

### Requirement: The audit log SHALL be tenant-isolated

`tenant_audit_events.tenant_id` SHALL be NOT NULL and the RLS select policy MUST scope rows to the caller's memberships, so an admin of tenant X never sees a row from tenant Y.

#### Scenario: cross-tenant read
- **GIVEN** an admin of tenant X
- **WHEN** they query `tenant_audit_events`
- **THEN** RLS returns only rows where `tenant_id = X`
- **AND** no row from tenant Y is visible

### Requirement: Staff SHALL see a limited subset

The RLS policy SHALL further restrict `staff` callers to rows where `target_kind = 'appointment'`, and rows targeting `membership`/`service`/`availability_rule`/`availability_exception`/`tenant` MUST be invisible to staff.

#### Scenario: staff opens audit log
- **GIVEN** a `staff` member of `acme`
- **WHEN** they read `tenant_audit_events` (UI may not even show them this; if accessed via API)
- **THEN** they see only events with `target_kind in ('appointment')`
- **AND** events of `target_kind in ('membership', 'service', 'availability_rule', 'availability_exception', 'tenant')` are filtered out

### Requirement: Audit rows SHALL be correlated with their originating request

Edge Functions SHALL set `app.request_id` (and `app.is_guest_token` when relevant) as transaction-local GUCs; the audit trigger MUST read them into `payload.request_id` and `by_kind` so each row can be matched back to its originating Edge Function log line.

#### Scenario: triggered from an Edge Function
- **GIVEN** an Edge Function sets `app.request_id` GUC at transaction start
- **WHEN** the function performs a tenant-scoped mutation triggering an audit row
- **THEN** the audit row's `payload.request_id` equals the Edge Function's `request_id`
- **AND** searching Supabase Edge Function logs by that `request_id` returns the originating call

#### Scenario: triggered from a guest manage token
- **GIVEN** the `manage-appointment` function sets `app.is_guest_token = 'true'`
- **WHEN** a guest cancels via token
- **THEN** the resulting audit row has `by_user_id = null, by_kind = 'guest_token'`

### Requirement: Audit log SHALL be retained for 24 months

A daily `purge_old_audit_events` `pg_cron` job SHALL delete `tenant_audit_events` rows older than 24 months, and rows newer than the threshold MUST never be touched by the purge.

#### Scenario: scheduled purge
- **GIVEN** a `tenant_audit_events` row with `created_at < now() - interval '24 months'`
- **WHEN** the daily `purge_old_audit_events` job runs
- **THEN** the row is deleted
- **AND** rows newer than the threshold are untouched

### Requirement: Admins SHALL be able to browse the audit log

The admin Audit Log tab SHALL render the most recent 50 events in reverse chronological order with kind icon, localized label, actor, and timestamp; tapping a row MUST present a bottom sheet showing the full payload with per-column before/after diffs for update events.

#### Scenario: viewing recent activity
- **GIVEN** an admin of `acme` opens the Audit Log tab
- **WHEN** the screen renders
- **THEN** the most recent 50 events are shown in reverse chronological order
- **AND** each row shows the kind icon, localized label, actor name, and timestamp

#### Scenario: filtering
- **WHEN** the admin filters by `kind = 'service.updated'` and a date range of "last 7 days"
- **THEN** only matching rows are shown
- **AND** the count reflects the filter

#### Scenario: detail view
- **WHEN** the admin taps a row
- **THEN** a bottom sheet shows the full payload, with `before`/`after` columns highlighted for update events
- **AND** for update events with multiple columns, each column's diff is presented individually

