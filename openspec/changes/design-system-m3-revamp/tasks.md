# Tasks

## Phase 1 — Theme foundation

- [x] 1.1 Replace `src/design/tokens.ts` with M3 type scale, shape scale, 4dp spacing, M3 elevation, Ma3ady success/warning role colors
- [x] 1.2 Add `src/design/palette.ts` exporting `buildPalette(sourceHex, mode)` (OKLCH ramp); include six source presets
- [x] 1.3 Replace `src/design/theme.ts` `Theme` type with M3 role table; keep legacy `bg/surface/border/text/muted/brand/accent/success/warning/danger` keys as a compatibility view
- [x] 1.4 Update `src/design/ThemeProvider.tsx` to read active tenant brand color from `useTenantStore`, regenerate palette on change, persist user preference
- [x] 1.5 Update `src/design/BrandColorPicker.tsx` to use the new 6-source preset row

## Phase 2 — Atoms

- [x] 2.1 Refresh `src/components/Button.tsx` (`filled` / `tonal` / `outlined` / `text` / `elevated`, pill radius)
- [x] 2.2 Refresh `src/components/Card.tsx` (`kind` prop)
- [x] 2.3 Refresh `src/components/Input.tsx` (M3 outlined field, leading/trailing icon slots)
- [x] 2.4 Refresh `src/components/Text.tsx` (M3 type variants via tokens; legacy aliases retained)
- [x] 2.5 Refresh `src/components/StatusBadge.tsx` (role containers, pill, leading icon)
- [x] 2.6 Add `src/components/Chip.tsx`
- [x] 2.7 Add `src/components/FAB.tsx`
- [x] 2.8 Add `src/components/Switch.tsx`
- [x] 2.9 Add `src/components/TopAppBar.tsx`
- [x] 2.10 Add `src/components/ListItem.tsx`
- [x] 2.11 Add `src/components/AnimatedCheck.tsx`
- [x] 2.12 Add `src/components/TonalBlobs.tsx`

## Phase 3 — Supabase

- [x] 3.1 Migration `023_tenant_branding_extensions.sql`: add `tenants.type`, `tenants.location`, `tenants.cancellation_policy`
- [x] 3.2 Update `src/types/database.ts` (manual); thread new fields through `src/types/db.ts`
- [x] 3.3 Update `src/services/api/tenants.ts` (read + write paths)
- [x] 3.4 Update `src/services/api/onboarding.ts` + `claim-slug` Edge Function to accept `type` and `location`

## Phase 4 — Onboarding

- [x] 4.1 Refresh `app/(onboarding)/welcome.tsx` — tonal blobs + hero copy + primary + guest CTA + ToS footer
- [x] 4.2 Refresh `app/(onboarding)/claim-slug.tsx` — prefix input, type chip row, brand color swatch row
- [x] 4.3 Refresh `app/(onboarding)/joined.tsx` — AnimatedCheck + share-link pill + copy/share/dashboard

## Phase 5 — Public booking

- [x] 5.1 Refresh `app/(public)/[tenantSlug]/index.tsx` — tenant header + powered-by footer + service cards
- [x] 5.2 Refresh `src/components/DayStrip.tsx` — pressure dots + selected pill geometry
- [x] 5.3 Refresh `src/components/SlotGrid.tsx` — section tiles + section-tinted pills
- [x] 5.4 Refresh `app/(public)/[tenantSlug]/[serviceId]/slots.tsx` — footer tip
- [x] 5.5 Refresh `app/(public)/[tenantSlug]/[serviceId]/book.tsx` — primary-container summary + icon-leading inputs + M3 checkbox
- [x] 5.6 Refresh `app/(public)/[tenantSlug]/[serviceId]/confirmation/[appointmentId].tsx` — hero + summary + calendar chips + QR share + policy
- [x] 5.7 Add `react-native-qrcode-svg` to deps

## Phase 6 — Admin

- [x] 6.1 Refresh `app/(admin)/(tabs)/index.tsx` — share-link button + 3-tile grid + vertical timeline + "Now" pulse
- [x] 6.2 Refresh `app/(admin)/(tabs)/upcoming.tsx` — grouped section list + time pills
- [x] 6.3 Add `src/features/admin/AvailabilityHeatmap.tsx` (30×7 grid + drag-paint)
- [x] 6.4 Refresh `app/(admin)/(tabs)/availability.tsx` — heatmap card + legend + footer tip
- [x] 6.5 Refresh `app/(admin)/(tabs)/services.tsx` — outlined cards + tile icon + Switch + extended FAB
- [x] 6.6 Refresh `app/(admin)/(tabs)/settings/index.tsx` — header + sectioned ListItems + location + cancellation policy form fields

## Phase 7 — Customer app

- [x] 7.1 Refresh `app/(app)/(tabs)/index.tsx` — featured primary-container card with countdown band + places-you-visit grid + discover card
- [x] 7.2 Refresh `app/(app)/(tabs)/bookings.tsx` — filter chips + filled cards
- [x] 7.3 Refresh `app/(app)/bookings/[id].tsx` — header + outlined detail card + tonal Reschedule + text Cancel
- [x] 7.4 Refresh `app/(app)/(tabs)/settings.tsx` — profile + sectioned ListItems + destructive sign-out
- [x] 7.5 Refresh `app/(app)/tenants/picker.tsx` — branded icon tiles via ListItem cards

## Phase 8 — i18n + RTL

- [x] 8.1 ~80 new keys added across `en.json` + `ar.json` (onboarding, booking buckets/confirmation, admin heatmap/now, customer home places/discover, settings sections)
- [x] 8.2 RTL behaviour: every new component uses `start/end` writing-aware style keys exclusively (enforced by the existing `ma3ady-rules/no-physical-direction` ESLint rule)
- [x] 8.3 `pnpm lint`, `pnpm typecheck`, `pnpm exec jest` — all green; snapshots refreshed to match the M3-derived hex values
