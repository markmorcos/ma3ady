# Design

## Context

Observability is usually where projects accidentally invite a sub-processor party. We're keeping ma3ady tight: Supabase's logs cover the backend, a single table covers the mobile side, structured logging conventions tie them together by `request_id`. That's it for v1.

## Goals

- Every Edge Function invocation has a `request_id` and structured start/end log lines.
- Every mobile error finds its way to a queryable place (`client_errors` table + Supabase Logs).
- Triage flow: from a user complaint to the relevant log lines in <60 seconds.
- Zero added sub-processors.
- Production sampling keeps log volume sane.

## Non-Goals

- Performance traces (APM). Defer; Supabase exposes `pg_stat_statements` for DB profiling, that's enough for v1.
- Real-time alerting (PagerDuty etc). Defer; Supabase has email alerts on plan limits, sufficient for early access.
- A frontend "session replay" tool (FullStory, LogRocket) — adds tracker, off-table for v1.
- Distributed tracing (OpenTelemetry). Defer; the system is small enough that `request_id` correlation suffices.

## Decisions

1. **Supabase Logs for backend, table for mobile**. The two surfaces have different retention and access models. Supabase Logs has plan-tier retention (free 1 day, Pro longer); good for backend forensics. The `client_errors` table gives us application-level access (admins triage their own tenant's errors via the dev-tools screen) and full retention until a separate cleanup job decides otherwise.
2. **`request_id` is the join column**. A mobile error log records it; the corresponding Edge Function log carries it; the Postgres log can be cross-referenced (Supabase logs allow filtering by SQL state and timestamps). Simple, debuggable.
3. **`withLogging(handler)` HOC**. Adopting it once means every function logs consistently. Without it, conventions drift across functions.
4. **`logError` is best-effort**. If the crash reporter itself crashes, we suppress (no error loop) and console-log the inner failure. The user-facing app must not get worse because we tried to log something.
5. **Sample 10% of non-fatal errors in production**. Boundary errors (a screen actually crashed) always sample. Non-fatal noise (e.g., a fetch retry that eventually succeeded) is sampled. Better to lose detail than to drown our logs.
6. **No PII in payloads by convention**. Stack traces are fine; payloads must avoid emails / names / etc. Code review enforces.
7. **RLS is strict**: inserts only via SECURITY DEFINER Edge Function. Without it, an authenticated user could spam-insert errors into another tenant's bucket (a small but real abuse vector).
8. **Keep the option open for Sentry**. The interface around `logError` is provider-shaped already. If signal-to-noise warrants Sentry post-launch, swapping the implementation is a contained change. We just don't pay the upfront cost now.
9. **A sample-100% preview environment** lets us run a launch beta with full visibility. Volume is low, so the noise is OK.
