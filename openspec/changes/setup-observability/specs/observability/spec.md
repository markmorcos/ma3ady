# observability — Spec Delta

## ADDED Requirements

### Requirement: Edge Functions SHALL emit structured logs with a request id

#### Scenario: function call lifecycle
- **GIVEN** any Edge Function wrapped by `withLogging`
- **WHEN** the function is invoked
- **THEN** a JSON log line `event: "function_start"` is emitted with a fresh `request_id` UUID
- **AND** on success, `event: "function_end"` is emitted with the same `request_id` and the elapsed duration in ms
- **AND** on thrown error, `event: "function_error"` is emitted with `request_id`, error message, and stack — and the original error is rethrown so HTTP-layer mapping still works

#### Scenario: cross-function correlation
- **GIVEN** function A invokes function B (via `supabase.functions.invoke`)
- **WHEN** function A passes its `request_id` in an `x-request-id` header
- **THEN** function B's `withLogging` reuses that `request_id`
- **AND** the resulting logs can be filtered by a single `request_id` to see the full call graph

### Requirement: Mobile errors SHALL be reported to a queryable backend

#### Scenario: render error caught by boundary
- **GIVEN** a screen throws during render
- **WHEN** `<RouteErrorBoundary>` catches the error
- **THEN** `logError(error, { kind: 'boundary', context: { route } })` is called
- **AND** because boundary errors are always sampled, a `client_errors` row is inserted via `report-client-error`
- **AND** a corresponding `event: "client_error"` log line appears in Supabase Edge Function logs with the same `request_id`

#### Scenario: production sampling
- **GIVEN** `EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE=0.1`
- **AND** an unhandled rejection of `kind: 'unhandled_rejection'`
- **WHEN** `logError` runs 1000 times
- **THEN** approximately 100 calls to `report-client-error` occur
- **AND** boundary-kind errors continue to bypass sampling

#### Scenario: report-client-error is best-effort
- **GIVEN** the Edge Function endpoint is unavailable
- **WHEN** `logError` invokes it and the call fails
- **THEN** the failure is silently swallowed (no nested error report attempted)
- **AND** a `console.warn` is emitted in dev for visibility

### Requirement: `client_errors` SHALL be tenant-scoped via RLS

#### Scenario: cross-tenant read attempt
- **GIVEN** an admin of tenant X
- **WHEN** they query `client_errors` directly
- **THEN** RLS filters to rows where `tenant_id = X` only

#### Scenario: anonymous insert blocked
- **GIVEN** an authenticated user with the anon key
- **WHEN** they attempt a direct INSERT into `client_errors`
- **THEN** the policy denies the operation
- **AND** the only path is via `report-client-error` (SECURITY DEFINER)

### Requirement: The reporter SHALL rate-limit and bound payload size

#### Scenario: payload too large
- **GIVEN** a body of 9KB sent to `report-client-error`
- **WHEN** the function processes
- **THEN** it returns HTTP 413 with body `{ error: "payload_too_large" }`
- **AND** no row is inserted

#### Scenario: rate limit exceeded
- **GIVEN** an IP that has sent 30 valid requests in the last 60 seconds
- **WHEN** a 31st request arrives within that window
- **THEN** the function returns HTTP 429 with body `{ error: "rate_limited" }`
- **AND** no row is inserted

### Requirement: Admins SHALL be able to view recent errors for their tenant

#### Scenario: admin opens dev-tools/errors
- **GIVEN** an admin of tenant `acme` opens `/(admin)/dev-tools/errors`
- **WHEN** the screen mounts
- **THEN** the last 100 `client_errors` rows for `tenant_id = acme` are listed
- **AND** filters by `kind` and date range work
- **AND** tapping a row shows full message, stack, and payload

#### Scenario: staff cannot view
- **GIVEN** a `staff` role
- **WHEN** they navigate to the same path
- **THEN** the route is not in their navigation
- **AND** if they hit it directly, the screen shows "Insufficient permission"

### Requirement: No third-party trackers SHALL be present in v1

#### Scenario: dependency check
- **GIVEN** `package.json`
- **WHEN** inspected for any of: `@sentry/*`, `posthog-*`, `@amplitude/*`, `mixpanel-*`, `@bugsnag/*`, `firebase` (Crashlytics), `@datadog/*`
- **THEN** none of these packages are present in v1
- **AND** any future addition requires a separate change folder with privacy-policy update
