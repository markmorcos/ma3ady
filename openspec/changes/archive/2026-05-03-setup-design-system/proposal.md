# Setup design system

## Why

Every screen built after this change consumes design tokens. Defining them once — colors, typography, spacing, radii, shadows, elevations, motion — prevents the inconsistency that always creeps in when each screen reaches for hex literals. Branding lives here too: the wordmark + clock-3 mark assets, splash, and app icon (placeholders for now; the final designer-cut SVGs land in a brand-asset PR before launch).

## What Changes

- **ADDED** `src/branding/` — `logo.tsx` (wordmark component), `mark.tsx` (clock-3 mark component), brand asset paths
- **ADDED** `assets/branding/` — placeholder SVGs for `wordmark-en.svg`, `wordmark-ar.svg`, `mark.svg` (designer cut later)
- **ADDED** `src/design/tokens.ts` — `colors`, `typography`, `spacing`, `radii`, `shadows`, `motion` exported as typed const objects
- **ADDED** `src/design/theme.ts` — `lightTheme`, `darkTheme`, `Theme` type
- **ADDED** `src/design/ThemeProvider.tsx` — react context + `useTheme()` hook + system theme detection via `Appearance`
- **ADDED** `src/components/Button.tsx` (variants: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`, `lg`)
- **ADDED** `src/components/Text.tsx` — preset typography (display, h1, h2, body, caption, label)
- **ADDED** `src/components/Card.tsx`
- **ADDED** `src/components/Badge.tsx` (status badges: pending, confirmed, completed, cancelled, no_show)
- **ADDED** `src/components/Input.tsx`
- **ADDED** `src/components/Icon.tsx` — Lucide-backed wrapper, takes a token color
- **ADDED** `src/components/EmptyState.tsx`
- **ADDED** `src/components/Skeleton.tsx`
- **ADDED** `src/components/Sheet.tsx` — bottom sheet wrapper around `@gorhom/bottom-sheet`
- **ADDED** `src/components/Toast.tsx` + `src/state/toastStore.ts`
- **ADDED** ESLint rules: no inline hex in styles; no `left`/`right` (use `start`/`end`)
- **ADDED** `/dev/design-system` showcase route for visual QA across themes + locales

## Impact

- Affects `branding` and `design-system` capabilities (initial specs).
- Every subsequent screen change pulls from these primitives.
- Color tokens align with `openspec/project.md` §1b.
