# Implement availability rules — weekly grid editor

## Why

Per user decision, the rules editor is a grid (not a form). On mobile, this becomes a vertical list of seven days, each row showing the configured time bands and a "+" to add a band, with drag handles to adjust start/end times. Power tenants can copy a day's rules to other days.

Exception management lives on the same screen: a "Block time" CTA opens a date+time picker; an "Add extra availability" CTA does the same with `kind = 'extra'`.

## What Changes

- **ADDED** route `app/(admin)/availability.tsx` (added as a sixth admin tab) — or alternatively as a sub-route of Settings depending on UX trial; default is its own tab
- **ADDED** components:
  - `<WeeklyRulesGrid>` — list of 7 days with time bands per day
  - `<TimeBandRow>` — one band with start/end pickers + delete
  - `<DayCopyMenu>` — "copy this day's rules to..." action sheet
  - `<ExceptionList>` — list of upcoming exceptions with edit/delete
  - `<ExceptionForm>` — modal form for adding block or extra exception
- **ADDED** `src/services/api/availability.ts` already covers reading; this change adds: `upsertRule`, `deleteRule`, `upsertException`, `deleteException`
- **ADDED** RPC `bulk_replace_rules_for_day(p_tenant_id uuid, p_day_of_week int, p_bands jsonb)` — atomically replaces all rules for a day with a new list (avoids partial states during edit)

## Impact

- Affects `availability` capability (delta).
- Required by tenant onboarding to be useful — without rules, the booking flow has no slots.
- The change ships *after* admin dashboard (11) so it slots in as a tab cleanly.
