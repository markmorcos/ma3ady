# Design

## Context

The Ma3ady codebase already implements the full feature surface (onboarding, public booking, customer app, admin) with a Tailwind-style token set. The design handoff replaces only the visual layer and the three "novel moments". This change is therefore a **visual + interaction refresh**, not a feature rewrite.

The most important architectural decision is how to introduce the M3 dynamic palette without forcing every screen to be migrated in lock-step. The solution is to make the new theme **shape-compatible** with the old one at the `useTheme()` boundary: M3 role tokens land alongside the old `bg/surface/border/text/muted/brand/accent/success/warning/danger` keys, which keep their old meaning. This lets atoms migrate first, screens later, with the tree compiling at every step.

## Goals

- One `useTheme()` call powers every component, light/dark + per-tenant brand.
- The palette regenerates whenever `tenants.brand_color` changes (claim-slug + admin settings).
- The three novel moments ship as the design specifies; nothing is degraded for shipping cost.
- Production builds keep working in Expo Go (no native modules added beyond what Expo SDK 55 already exposes; `react-native-qrcode-svg` is pure JS + SVG).
- No RLS or RPC changes. Only additive tenant columns.

## Non-Goals

- True HCT color science. We approximate with OKLCH lightness ramps per the handoff's own caveat. `@material/material-color-utilities` is a follow-up swap.
- Storage-backed assets (logos, avatars, service photos). Per `project.md` §1f there is no Supabase Storage in v1.
- Avatars / staff resources / per-service icons. Out of scope.
- Real QR for the public confirmation flow can be added now; manage URL is signed-token-deeplink (already supported).

## Decisions

1. **OKLCH for palette generation, not HCT.** The handoff calls this out as an explicit approximation. The `culori`-style math is small enough to inline; we don't need a runtime dep. Roles map per the handoff table.
2. **Token compatibility layer.** New `theme.colors` carries both the M3 role keys (`primary`, `primaryContainer`, …) and the legacy short keys (`brand`, `surface`, `text`, …). Legacy keys are recomputed from M3 roles. One migration commit deletes the legacy keys after every component is updated.
3. **Text variant aliases.** Old variants (`display, h1, h2, h3, body, bodyStrong, caption, label`) remain valid props on `<Text>`, mapping to the closest M3 role. New code uses M3 names directly (`headlineLg`, `titleMd`, etc.). Aliases are deprecated, not deleted.
4. **Expressive is the default.** The handoff says expose a flag; we'll wire it as a `ThemeProvider` prop but default-on. Internal tweak only — no user-facing setting.
5. **Hours heatmap drag interaction.** Use `react-native-gesture-handler` `Pan` over the grid; map gesture XY → cell coords; maintain a `paintedCells` set in `useState`; on release, call `bulkReplaceRulesForDay` for each affected day. Single tap = toggle one cell. Long-press a band = open exception editor seeded with that band's range.
6. **DayStrip pressure dots.** Drive scarcity from the same data already returned by `getAvailableSlots`: count slots per day in the window, paint the warning pill when `count <= 3`. No new API.
7. **Confirmation countdown.** Derived from `startsAt - now`. Updates every minute via a `useEffect` interval. The countdown pill is a `Chip kind="tonal"`.
8. **AnimatedCheck.** `react-native-reanimated` (already installed) — `withSequence(withSpring, withTiming)` for the pop, `withTiming` on `strokeDashoffset` for the stroke draw. Path is a hard-coded SVG `M` command.
9. **Tenant type enum is small and curated.** `generic`, `salon`, `clinic`, `auto`. Adding more later is a one-line migration (`alter type`). Default value is `'generic'` so all existing rows pass.
10. **Tenant location is unstructured text.** The handoff calls it "type · location" — a one-line freeform field is enough for v1. Structured address is a follow-up.
11. **Cancellation policy is plain text.** Same rationale. Rendered with `numberOfLines={4}` initially and a "Read more" expand on tap (sheet).
12. **QR uses `react-native-qrcode-svg`.** Pure JS + SVG, zero native modules, works in Expo Go. Encodes the manage URL.

## Risks

- **Palette regression in dark mode.** OKLCH dark inversion can flatten contrast. Mitigation: contrast-check every role against on-color (we'll add a `dev/design-system` panel to eyeball).
- **Heatmap performance with 210 cells.** 30 × 7 = 210 `<View>`s + a pan responder. We'll memoize per-cell rendering and lift the gesture into a single root pan, not per-cell.
- **Bottom-nav indicator replacement.** Replacing react-navigation's default styling with the M3 pill requires `tabBarStyle` + a custom `tabBarBackground`. Reversible — we keep the existing tab structure.
- **Migration race for `tenants.type`.** The default `'generic'` ensures every existing row passes. Edge functions and Edge-served public views need a re-deploy after the migration; we'll note that in the release checklist.

## Migration Plan

Inside the single PR, commits land in this order so every commit boundary is green:

1. OpenSpec change folder (this file).
2. Theme system: new tokens + palette generator + ThemeProvider, **with both old and new keys present**. Old screens still render exactly as before.
3. Atoms refresh (Button, Card, Input, Text, StatusBadge + new Chip/FAB/Switch/TopAppBar/ListItem/AnimatedCheck/TonalBlobs). Old keys still consumed where convenient.
4. Supabase migration + types regen + tenant API updates.
5. Onboarding refresh.
6. Public booking refresh (DayStrip + SlotGrid + book + confirmation).
7. Admin refresh (Today timeline + Hours heatmap + Upcoming + Services + Settings).
8. Customer app polish (home, bookings list, booking detail, settings).
9. i18n additions + Arabic + RTL spot-check.
10. Cleanup: drop legacy color keys, drop deprecated Text variant aliases, run `lint` + `typecheck` + `test`.
