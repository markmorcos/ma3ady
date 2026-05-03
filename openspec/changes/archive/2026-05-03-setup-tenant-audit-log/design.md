# Design

## Context

`appointment_events` is per-appointment; we need an audit trail at the tenant level. Every operational change (who invited whom, who edited a service, who changed timezone) needs to be recoverable for incident response. Tenants will ask: "who changed this?" — the answer must exist.

## Goals

- One `tenant_audit_events` table covers every meaningful tenant-level mutation.
- Triggers do the writing — application code can't accidentally skip an audit entry.
- The audit log is immutable from the application's perspective.
- Admins can browse their own tenant's audit log; cross-tenant isolation is enforced by RLS.
- Retention is bounded.

## Non-Goals

- Audit logs for read operations (overkill for v1; SOC 2 Type II might want this someday).
- Diff visualization beyond before/after payloads (no JSON-diff component in v1).
- Exporting audit logs (could be added when needed; structured query via Supabase Studio is enough for now).
- Federated audit across services (we have one Postgres; no need).

## Decisions

1. **Triggers, not application code, write audit rows**. Application code drifts; triggers are mechanical. If a new path mutates a service without going through the typical Edge Function, the audit row still appears.
2. **`record_audit(...)` SECURITY DEFINER helper**. Uniform shape across triggers. Reads context (auth.uid(), GUCs) consistently.
3. **GUCs (`app.request_id`, `app.is_guest_token`) thread context through**. Edge Functions set them at transaction start; triggers read them. Without this, audit rows can't be correlated to the originating request.
4. **Immutable from app POV**. No `UPDATE` or `DELETE` policies. Retention runs as a cron job with elevated privileges.
5. **Per-row payload, not normalized columns**. Audit shapes vary too much to normalize. JSONB is the right tool.
6. **Track only changes, not full row content on every event**. For UPDATE we record only the columns that actually changed (saves space, makes the audit log readable).
7. **Staff role gets a limited view**. Most audit events are owner/admin concerns. Staff doesn't need to see role changes for other staff. Limiting their view also keeps the screen useful for them — they see only what's relevant.
8. **24-month retention**. Long enough to investigate disputes from a year ago; bounded enough to not balloon storage. GDPR-friendly.
9. **Audit log is NOT a substitute for `appointment_events`**. They overlap on appointment-related events but live separately because they have different access patterns: appointment_events feeds the notifications dispatcher (read by Edge Functions); tenant_audit_events feeds an admin UI.
