# Revamp design system to Material Design 3 Expressive

## Why

The current visuals are a flat Tailwind-style system: a fixed teal brand color, simple light/dark themes, no per-tenant palette, generic type ramp, 12dp button radii. This change brings the product up to the **Material Design 3 (Expressive)** visual language documented in `design_handoff_ma3ady_v1` — a full HCT/OKLCH-derived dynamic palette per tenant brand color, the M3 type + shape scales, M3-Expressive defaults (pill buttons, 24dp card radii, full-radius chips), and the three "novel moments" the design pushes on: slot picker (pressure dots + time-of-day buckets), confirmation (hero card + animated check + countdown + share QR), admin Hours (weekly heatmap with band painting).

Per `project.md` §1b, components consume tokens through the active `ThemeProvider`. This change keeps that constraint but replaces the token set wholesale and regenerates the role palette per `tenants.brand_color`.

## What Changes

### Design tokens + theme

- **MODIFIED** `src/design/tokens.ts` — replace static palette with the M3 type scale (Display/Headline/Title/Body/Label × Small/Medium/Large), shape scale (`corner-none → corner-full`), 4dp spacing scale, M3 elevation levels (0/1/3/5), and Ma3ady success/warning role extensions.
- **MODIFIED** `src/design/theme.ts` — replace `Theme` with M3 role tokens (`primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer`, `secondary*`, `tertiary*`, `surface`, `surfaceContainerLow/High/Highest`, `outline`, `outlineVariant`, `error*`, `success*`, `warning*`).
- **ADDED** `src/design/palette.ts` — `buildPalette(sourceHex, mode)` builds the full M3 role table from a source color using an OKLCH lightness ramp approximation of HCT. Six source presets (`ma3ady`, `salon`, `clinic`, `auto`, `plum`, `ember`).
- **MODIFIED** `src/design/ThemeProvider.tsx` — accept the active tenant's `brand_color` (and optional `type`) from `useTenantStore`, regenerate the palette on change, persist user theme preference (light/dark/system) unchanged.

### Atoms

- **MODIFIED** `src/components/Button.tsx` — M3 variants `filled` / `tonal` / `outlined` / `text` / `elevated`; pill radius in Expressive mode; size scale `sm/md/lg`.
- **MODIFIED** `src/components/Card.tsx` — `kind` prop: `filled` (surface-container-high), `outlined`, `elevated`, `primary` (primary-container), `tertiary` (tertiary-container).
- **MODIFIED** `src/components/Input.tsx` — outlined M3 text field with floating-style label, leading/trailing icon slots.
- **MODIFIED** `src/components/Text.tsx` — M3 type variants (13 roles); old aliases kept as a transitional layer for one commit.
- **MODIFIED** `src/components/StatusBadge.tsx` — uses success/warning role containers per design table; pill radius; leading icon.
- **ADDED** `src/components/Chip.tsx` — assist/filter/input/suggestion chips, pill radius in Expressive.
- **ADDED** `src/components/FAB.tsx` — extended FAB with leading icon + label.
- **ADDED** `src/components/Switch.tsx` — M3 switch with thumb + track.
- **ADDED** `src/components/TopAppBar.tsx` — small / center-aligned / large variants.
- **ADDED** `src/components/ListItem.tsx` — leading icon + headline + supporting + trailing slot.
- **ADDED** `src/components/AnimatedCheck.tsx` — reanimated pop + stroke-draw checkmark used by onboarding/joined and booking/confirmation.
- **ADDED** `src/components/TonalBlobs.tsx` — three decorative organic blobs used by onboarding/welcome and confirmation hero.

### Onboarding

- **MODIFIED** `app/(onboarding)/welcome.tsx` — hero copy + tonal blobs + primary "Sign up your business" + ghost "Continue as guest" + ToS footer.
- **MODIFIED** `app/(onboarding)/claim-slug.tsx` — refresh field styling, slug input gains `ma3ady.com/t/` prefix + live availability check icon, locale chips, brand-color swatch row.
- **MODIFIED** `app/(onboarding)/joined.tsx` — `AnimatedCheck` hero, share-link pill, copy/share/dashboard CTAs.

### Public booking

- **MODIFIED** `app/(public)/[tenantSlug]/index.tsx` — tenant header row (avatar + name + type · location), hours/rating chip row, M3 service cards with chevron.
- **MODIFIED** `src/components/DayStrip.tsx` — pressure-dot pattern: warning pill when `free <= 3 && > 0`, full-on-primary dot when selected, closed days at 0.45 opacity and non-tappable, M3 pill geometry.
- **MODIFIED** `src/components/SlotGrid.tsx` — three time-of-day sections (morning/afternoon/evening) each with: icon tile (tertiary/primary/secondary container) + section title + `free/total` counter; section-tinted slot pills with M3 state layers; struck-through taken pills.
- **MODIFIED** `app/(public)/[tenantSlug]/[serviceId]/slots.tsx` — wire the new DayStrip + SlotGrid signatures; footer tip card.
- **MODIFIED** `app/(public)/[tenantSlug]/[serviceId]/book.tsx` — primary-container summary card; outlined inputs with leading icons; custom M3 checkbox.
- **MODIFIED** `app/(public)/[tenantSlug]/[serviceId]/confirmation/[appointmentId].tsx` — hero card (blobs + AnimatedCheck + "in N hours" countdown), appointment summary, add-to-calendar chip row, tertiary "Bring a friend" QR share card, policy card, manage + save-to-account CTAs.
- **ADDED** dependency `react-native-qrcode-svg` for the share QR.

### Admin

- **MODIFIED** `app/(admin)/(tabs)/index.tsx` — share-link dashed button, 3 colored stat tiles (today / this week / no-show rate), vertical timeline with "Now" pulse on the current row.
- **MODIFIED** `app/(admin)/(tabs)/upcoming.tsx` — grouped-by-day section list with 56dp time pills on the leading edge.
- **MODIFIED** `app/(admin)/(tabs)/availability.tsx` — replace per-day card list with a **30×7 weekly heatmap** + legend + tip card. Cells: open (primary fill, capsule top/bottom), closed (surface-container-highest), block exception (error-container + 45° stripes), extra-hours exception (success-container + 45° stripes). Drag-paint a band → commit via existing `bulkReplaceRulesForDay` RPC. Long-press a band → exception editor (reuse existing modal).
- **ADDED** `src/features/admin/AvailabilityHeatmap.tsx`.
- **MODIFIED** `app/(admin)/(tabs)/services.tsx` — outlined cards with type-derived icon tiles + active toggle + extended FAB.
- **MODIFIED** `app/(admin)/(tabs)/settings/index.tsx` — header row with edit affordance, sectioned ListItem groups (Business / Team / Appearance / Advanced), destructive deactivate row.

### Customer app

- **MODIFIED** `app/(app)/(tabs)/index.tsx` — greeting Headline; featured next-appointment primary card with countdown band + Check-in / Reschedule buttons; "Places you visit" 2-col grid (derived from past appointments); "Discover" filled card.
- **MODIFIED** `app/(app)/(tabs)/bookings.tsx` — upcoming/past chip filter; filled cards with brand-tinted tenant icon tile.
- **MODIFIED** `app/(app)/bookings/[id].tsx` — header avatar + status badge; outlined card with date/location rows; tonal Reschedule/Cancel; receipt card.
- **MODIFIED** `app/(app)/(tabs)/settings.tsx` — profile row, sectioned ListItem groups, destructive sign-out.

### Supabase

- **ADDED** migration `023_tenant_branding_extensions.sql`:
  - `tenants.cancellation_policy text null`
  - `tenants.type tenant_type not null default 'generic'` with enum (`generic`, `salon`, `clinic`, `auto`)
  - `tenants.location text null`
- **MODIFIED** `src/types/db.ts` (regenerated) + `src/services/api/tenants.ts` + `src/services/api/onboarding.ts` to thread the new fields.
- **MODIFIED** RLS-affecting tests under `supabase/tests/` to assert the new columns are readable by anon for the tenant public view.

### i18n

- **MODIFIED** `src/i18n/locales/en.json` + `ar.json` — add ~80 keys for the new copy ("Time, on your terms", "You're on the books", "Bring a friend", bucket names, heatmap legend, etc.). Arabic-Indic numeral helper applied through the existing `Time` component.

## Impact

- Affects capabilities: **design-system** (palette generator, atoms, M3 tokens), **public-booking** (novel slot picker, novel confirmation), **admin** (novel heatmap, timeline), **app-shell** (bottom-nav pill indicator, top app bars), **tenancy** (new columns), **i18n** (new copy).
- Risk surface: the theme replacement touches every screen at once. Every screen continues to compile because `Text` keeps the old variant names as aliases; component-level visuals change uniformly through the new `ThemeProvider`.
- Heatmap is the highest-risk new component — keeps the existing exception editor sheet untouched.
- No breaking RLS or RPC changes. New tenant columns are nullable / defaulted so existing rows pass.
