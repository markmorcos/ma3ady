# Tasks

## Phase 1 — Theme foundation

- [ ] 1.1 Replace `src/design/tokens.ts` with M3 type scale, shape scale, 4dp spacing, M3 elevation, Ma3ady success/warning role colors
- [ ] 1.2 Add `src/design/palette.ts` exporting `buildPalette(sourceHex, mode)` (OKLCH ramp); include six source presets
- [ ] 1.3 Replace `src/design/theme.ts` `Theme` type with M3 role table; keep legacy `bg/surface/border/text/muted/brand/accent/success/warning/danger` keys as a compatibility view
- [ ] 1.4 Update `src/design/ThemeProvider.tsx` to read active tenant brand color from `useTenantStore`, regenerate palette on change, persist user preference
- [ ] 1.5 Update `src/design/BrandColorPicker.tsx` to use the new 6-source preset row

## Phase 2 — Atoms

- [ ] 2.1 Refresh `src/components/Button.tsx` (`filled` / `tonal` / `outlined` / `text` / `elevated`, pill radius, M3 state layer)
- [ ] 2.2 Refresh `src/components/Card.tsx` (`kind` prop)
- [ ] 2.3 Refresh `src/components/Input.tsx` (M3 outlined field, leading/trailing icon slots)
- [ ] 2.4 Refresh `src/components/Text.tsx` (M3 type variants + back-compat alias map)
- [ ] 2.5 Refresh `src/components/StatusBadge.tsx` (role containers, pill, leading icon)
- [ ] 2.6 Add `src/components/Chip.tsx`
- [ ] 2.7 Add `src/components/FAB.tsx`
- [ ] 2.8 Add `src/components/Switch.tsx`
- [ ] 2.9 Add `src/components/TopAppBar.tsx`
- [ ] 2.10 Add `src/components/ListItem.tsx`
- [ ] 2.11 Add `src/components/AnimatedCheck.tsx`
- [ ] 2.12 Add `src/components/TonalBlobs.tsx`

## Phase 3 — Supabase

- [ ] 3.1 Migration `023_tenant_branding_extensions.sql`: add `tenants.type`, `tenants.location`, `tenants.cancellation_policy`
- [ ] 3.2 Regenerate `src/types/database.ts`; thread new fields through `src/types/db.ts`
- [ ] 3.3 Update `src/services/api/tenants.ts` (read + write paths)
- [ ] 3.4 Update `src/services/api/onboarding.ts` to accept `type` from claim-slug

## Phase 4 — Onboarding

- [ ] 4.1 Refresh `app/(onboarding)/welcome.tsx` — tonal blobs + hero copy + primary + guest CTA + ToS footer
- [ ] 4.2 Refresh `app/(onboarding)/claim-slug.tsx` — prefix input, type chip row, brand color swatch row
- [ ] 4.3 Refresh `app/(onboarding)/joined.tsx` — AnimatedCheck + share-link pill + copy/share/dashboard

## Phase 5 — Public booking

- [ ] 5.1 Refresh `app/(public)/[tenantSlug]/index.tsx` — tenant header + hours/rating chip row + service cards
- [ ] 5.2 Refresh `src/components/DayStrip.tsx` — pressure dots + selected pill geometry
- [ ] 5.3 Refresh `src/components/SlotGrid.tsx` — section tiles + section-tinted pills + taken styling
- [ ] 5.4 Refresh `app/(public)/[tenantSlug]/[serviceId]/slots.tsx` — footer tip
- [ ] 5.5 Refresh `app/(public)/[tenantSlug]/[serviceId]/book.tsx` — primary-container summary + icon-leading inputs + M3 checkbox
- [ ] 5.6 Refresh `app/(public)/[tenantSlug]/[serviceId]/confirmation/[appointmentId].tsx` — hero + summary + calendar chips + QR share + policy
- [ ] 5.7 Add `react-native-qrcode-svg` to deps

## Phase 6 — Admin

- [ ] 6.1 Refresh `app/(admin)/(tabs)/index.tsx` — share-link button + 3-tile grid + vertical timeline + "Now" pulse
- [ ] 6.2 Refresh `app/(admin)/(tabs)/upcoming.tsx` — grouped section list + time pills
- [ ] 6.3 Add `src/features/admin/AvailabilityHeatmap.tsx` (30×7 grid + pan painter)
- [ ] 6.4 Refresh `app/(admin)/(tabs)/availability.tsx` — heatmap card + legend + exception list + footer actions
- [ ] 6.5 Refresh `app/(admin)/(tabs)/services.tsx` — outlined cards + type icon tile + active switch + extended FAB
- [ ] 6.6 Refresh `app/(admin)/(tabs)/settings/index.tsx` — header + sectioned ListItems + destructive row

## Phase 7 — Customer app

- [ ] 7.1 Refresh `app/(app)/(tabs)/index.tsx` — featured card + places-you-visit grid + discover card
- [ ] 7.2 Refresh `app/(app)/(tabs)/bookings.tsx` — filter chips + filled cards
- [ ] 7.3 Refresh `app/(app)/bookings/[id].tsx` — header + outlined detail card + tonal actions + receipt
- [ ] 7.4 Refresh `app/(app)/(tabs)/settings.tsx` — profile + sectioned ListItems + destructive sign-out
- [ ] 7.5 Refresh `app/(app)/tenants/picker.tsx` — branded icon tiles

## Phase 8 — i18n + RTL

- [ ] 8.1 Add new keys under `onboarding.welcome.*`, `booking.bucket.*`, `booking.confirmation.*`, `admin.heatmap.*`, `app.home.*` in `en.json` + `ar.json`
- [ ] 8.2 Sweep each screen with `i18n.language = 'ar'` + RTL; fix any hard-coded directional padding/margin
- [ ] 8.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`; resolve all
