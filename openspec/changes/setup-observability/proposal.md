# Setup observability

## Why

Per `project.md` §12, ma3ady relies on **Supabase's built-in logs** as the backend source of truth — no Sentry, no PostHog, no third-party tracker in v1. Adding any third-party SDK costs a sub-processor disclosure, a privacy policy update, and (for Sentry's RN SDK) a config plugin that breaks Expo Go.

This change formalizes the conventions: structured logging in Edge Functions, a `client_errors` table for mobile-side reporting, an Edge Function that ingests them, an `ErrorBoundary` integration, and a sampling policy. It deliberately does NOT add Sentry. If signal-to-noise warrants it after launch, Sentry becomes its own change.

## What Changes

- **ADDED** migration `009_client_errors.sql`:
  - `client_error_kind enum('boundary','unhandled_rejection','manual','network','rls_denied')`
  - `client_errors(id, user_id nullable, tenant_id nullable, kind client_error_kind, message text, stack text, payload jsonb, app_version text, platform text, locale text, created_at)`
  - Index `(tenant_id, created_at desc)`, `(user_id, created_at desc)`, `(kind, created_at desc)`
  - RLS: insert via SECURITY DEFINER Edge Function only (clients never insert directly with user JWT — too easy to abuse); read by owner/admin of `tenant_id` (when set), or by user themselves
- **ADDED** Edge Function `report-client-error/`:
  - Accepts anon and authenticated callers
  - Validates payload size (≤8KB), rate-limits per IP (≤30 reqs/min)
  - Inserts a `client_errors` row
  - Logs to Supabase Edge Function logs as `event: "client_error"` for cross-referencing
- **ADDED** `src/services/observability/`:
  - `logError.ts` — `logError(error, { kind, context })` entry point used everywhere
  - `RootErrorBoundary.tsx` — wraps app, catches render errors, calls `logError`
  - `setupGlobalHandlers.ts` — installs `ErrorUtils.setGlobalHandler` and `process.on('unhandledRejection')` (where applicable)
  - `samplingPolicy.ts` — 100% in dev/preview, 10% non-fatal in production (full-sample on `kind === 'boundary'`)
- **ADDED** structured logging helper for Edge Functions:
  - `supabase/functions/_shared/log.ts` — `log({ event, level: 'info'|'warn'|'error', request_id, ...meta })` emits JSON to stdout
  - Every Edge Function imports `withLogging(handler)` that auto-tags requests with a `request_id`, logs `event: "function_start"` and `event: "function_end"` (or `function_error`) and the duration
- **ADDED** `app/(admin)/dev-tools/errors.tsx` (gated by admin role) — a viewer of recent `client_errors` for the active tenant
- **ADDED** Supabase Logs filters (documented as URLs in `docs/observability.md`):
  - "All Edge Function errors": `event = function_error`
  - "All client errors": `event = client_error`
  - "Slow Postgres queries": `duration > 500`
  - "Auth failures": `level = error AND component = 'gotrue'`
- **ADDED** `docs/observability.md` — runbook: where to find what, how to triage, when to escalate
- **ADDED** `EXPO_PUBLIC_CLIENT_ERROR_SAMPLE_RATE` env var (default 1.0 in dev/preview, 0.1 in prod via `eas.json`)
- **ADDED** structured logging to all Edge Functions (modifies `claim-bookings`, `claim-slug`, `invite-member`, `manage-appointment`, `update-appointment-status`, `reschedule-appointment`, `send-appointment-notification`, `report-client-error`, `delete-account`, `export-my-data`)

## Impact

- Affects `observability` capability (initial spec).
- Modifies every existing Edge Function to use `withLogging`. Touch is mechanical.
- No external dependencies beyond Supabase. Zero added sub-processors.
