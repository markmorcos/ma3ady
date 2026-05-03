# Observability runbook

ma3ady has two observability surfaces:

1. **Supabase Logs** — backend (Edge Functions, Postgres, Auth, Realtime)
2. **`client_errors` table** — mobile-side errors, accessible to admins of the tagged tenant via the dev-tools screen and to the user themselves

The two are joined by `request_id`. A client error logged from the mobile app
includes the `request_id` of the originating Edge Function call (when one
exists), so triage starts on either side and crosses cleanly.

## Where to find what

| Question | Surface | Filter |
|---|---|---|
| Did this Edge Function call succeed? | Supabase Logs (Edge Functions) | `event = function_end` AND `request_id = "<id>"` |
| Why did it fail? | Supabase Logs | `event = function_error` AND `request_id = "<id>"` |
| Was the slow response a DB query? | Supabase Logs (Postgres) | `duration > 500` near the timestamp |
| What did the user see crash? | `client_errors` (mobile) or Logs | `event = client_error` AND `kind = boundary` |
| Auth failure spike? | Supabase Logs | `level = error AND component = "gotrue"` |

## Triage flow

1. Start with the user's report: time, route, what they tapped.
2. If they have an in-app error (the toast or boundary screen), grab the
   `request_id` from the response (response header `x-request-id`) — every
   Edge Function that uses `withLogging` returns one.
3. In Supabase Logs, search the Edge Function project for that `request_id`.
   You'll see `function_start` → `function_end` (or `function_error`) with
   the duration.
4. If the function reported `function_end` with a non-2xx status, look at
   the JSON body of the user's request to see what mapped to that error.
5. If the function reported `function_error`, the stack trace is in the log
   payload.
6. If the issue is a slow query, cross-reference the Postgres logs near the
   same timestamp.

## Common queries

```
event = "function_error" AND timestamp > now() - 24h
event = "function_end" AND status >= 500 AND timestamp > now() - 1h
event = "client_error" AND kind = "boundary" AND timestamp > now() - 24h
event = "client_error_rate_limited" AND timestamp > now() - 1h
```

## Sampling

- Dev / preview: `EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE = 1.0` (every error
  reported)
- Prod: `EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE = 0.1` (10% of non-fatal,
  100% of `kind = boundary`)

Sampling is implemented in `src/services/observability/logError.ts`. If a
spike happens in production, raise the sample rate via EAS-injected env var
without code change.

## Escalation

| Symptom | Likely cause | Action |
|---|---|---|
| Mass 5xx from a single Edge Function | Function regression | Roll back the deploy via Supabase dashboard |
| All Edge Functions slow | Supabase plan limits | Check Supabase status + compute usage |
| Auth fails for all new sign-ins | Google OAuth / DNS | Verify OAuth client + DNS records (Cloudflare) |
| Postgres slow queries | Missing index / N+1 | `EXPLAIN ANALYZE` the slow statement; add index |

## Privacy

- **Never log emails, names, or guest contact details.** Stack traces and
  query parameters are fine; payloads must avoid PII. Code review enforces.
- Admins of a tenant can see `client_errors` for their tenant only — RLS
  scopes by `tenant_id`. Cross-tenant inspection is denied.
- Users can see their own errors (RLS by `user_id`).
