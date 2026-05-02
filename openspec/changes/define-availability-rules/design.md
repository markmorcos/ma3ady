# Design

## Context

Modeling availability as rules instead of materialized slot rows is the single biggest data-model improvement over the legacy app. The cost is moving complexity into a single Postgres function (`compute_available_slots`); the benefit is simplicity everywhere else.

## Goals

- Schedule changes are 1-row updates (insert/update a rule), never bulk regenerations.
- DST behaves correctly because rules are stored in tenant local time.
- "Show me 8 weeks ahead" needs no batch job — the function expands on demand.
- One-off availability adjustments ("I'm free this Saturday afternoon") fit naturally as `extra` exceptions.
- Blocked windows ("I'm out next Tuesday") fit as `block` exceptions.

## Non-Goals

- Per-staff schedules (deferred — `staff-resources` capability post-v1).
- Recurring exceptions (a holiday that repeats yearly is just N rows — fine for v1; a full RRULE engine waits).
- Variable-duration services (services have a single duration; if a tenant needs 30-min and 60-min appointments for the same service, they create two services).

## Decisions

1. **Local time on rules, timestamptz on exceptions and appointments**. Rules are inherently a "local schedule" concept ("9–5"); exceptions and bookings are concrete moments. Mixing them means the tenant TZ is needed to render rules but never needed to render exceptions/appointments.
2. **Function returns slots, not "intervals minus appointments minus exceptions"**. Callers want bookable starts. Doing the tiling in SQL keeps the math in one place.
3. **`security invoker` on the function**. RLS still applies to the underlying tables. This means anonymous booking pages get the same view of available slots that the function would give them through the regular tables — no privilege escalation.
4. **Service-level constraints (`buffer_*`, `min_notice_min`, `max_advance_days`, `daily_cap`) are per-service**. Different services (a 15-min consultation vs. a 90-min treatment) often want different rules. Keeping these on `services` rather than `tenants` is more flexible and adds zero cost since we always know the service when computing slots.
5. **`null` `service_id` on rules and exceptions = "applies to all services"**. The booking page for service S unions rules where `service_id = S OR service_id IS NULL`. This is a major ergonomics win for tenants who set blanket weekly hours and don't want to repeat them per service.
6. **No materialization of computed slots**. Some teams cache the next 8 weeks. We don't, in v1. The function is fast (one rule scan, one exception scan, one appointment anti-join — all indexed). Revisit if profiling shows otherwise. Materialization adds invalidation complexity that isn't worth paying upfront.
7. **DST handled by storing rules in `time without time zone` + tenant IANA zone**. We compute slots by combining a date in tenant TZ with the local time, then casting to UTC. DST transitions during a slot ("ambiguous local time") are handled by Postgres's standard rules; affected slots are skipped or duplicated as the platform dictates — we don't reinvent it.
