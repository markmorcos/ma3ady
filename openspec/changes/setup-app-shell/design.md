# Design

## Context

The app shell is everything that's "always there" — the structural skeleton that doesn't belong to any single feature. Boot sequence, route groups, error boundaries, splash, providers, the timezone hook. Without a dedicated change, these decisions get scattered and re-litigated.

## Goals

- One canonical boot sequence with explicit phases and timeouts.
- One canonical timezone hook (`useDisplayTimezone`) — every time-rendering component goes through it.
- One canonical route group layout that every feature understands.
- Two error boundary tiers: app-wide (catastrophic) and route-group (isolated).
- Cold-start interactive in <2s on mid-range hardware.

## Non-Goals

- Native splash design (deferred to brand assets in `setup-compliance-and-launch`).
- Animation choreography of boot transitions (defer; default Expo splash → app fade is fine).
- Loading skeletons for every screen — that's a per-feature concern.
- Offline-first behavior — defer until a feature actually needs it (none in v1 do).

## Decisions

1. **Boot phases are explicit and observable** via `appStore.bootPhase`. The `/dev/perf` screen reads it. CI tests assert phase ordering. Without this, "the splash is slow" investigations turn into log archaeology.
2. **5-second per-phase timeout, then degrade**. The app should always become interactive — even if Supabase is down, even if the user has no network. Degraded states (no auth restore, no tenant resolve) route to safe screens (sign-in, public landing).
3. **Two error boundary tiers**, not one global. A crash in the rules grid editor shouldn't kick the user back to the splash. Per-group boundaries keep the blast radius tight; the root boundary catches truly catastrophic failures.
4. **`useDisplayTimezone(context)` takes a context arg, not a runtime detection**. Each surface knows what it is (booking flow, customer view, admin view) — passing the context explicitly keeps the resolution logic readable. Auto-detecting from `useSegments()` would be magic.
5. **Override scope matches semantics**:
   - Public booking override → session-only (`sessionPrefsStore`). Customers don't have an account; we shouldn't persist preferences to their device for one tenant.
   - Admin override → persistent (`profiles.display_timezone_override`). Admins are recurring users; their preference matters across sessions.
6. **Time components, not Time hooks**. Could have done `const display = useFormattedTime(...)` but JSX components are clearer at the call site and easier to lint for.
7. **Time-render lint rule** is the enforcement. Without it, someone will write `<Text>{appointment.starts_at}</Text>` and ship UTC time to the user. Lint catches this at PR time.
8. **The boot sequence does NOT block on tenant resolve for the public booking flow**. If the deep link is `<slug>.ma3ady.com`, we know the tenant from the URL — auth state doesn't matter. Optimistic routing means a guest can hit the booking flow even before any auth attempt completes.
9. **Performance budget is part of the spec**, not a wish. 2s interactive on mid-range Android is a contract; regressions block merges.
