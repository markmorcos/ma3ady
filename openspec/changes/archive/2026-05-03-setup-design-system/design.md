# Design

## Context

The design system is the contract every UI change writes against. Get the tokens wrong and refactoring later is painful; get them right and screens compose like Lego.

## Goals

- One canonical source for colors, type, spacing, radii, motion.
- Components consume the theme, not the raw tokens.
- Light/dark/system + en/ar work in all permutations on day one.
- Visual QA via a dev-only showcase screen.

## Non-Goals

- Animations beyond simple transitions (motion tokens defined; complex animation work is per-feature).
- A web variant of the design system. Mobile-only. The marketing site has its own minimal CSS.
- A Figma library. Brand designer will produce the source of truth; we mirror tokens by hand for now.
- Custom font loading. Inter and IBM Plex Sans Arabic load via `expo-font`; this change does that, but doesn't ship a custom display font.

## Decisions

1. **Theme objects, not raw token maps**, are what components import. `useTheme().colors.brand[500]` resolves to a hex; the hex source differs by light/dark. This means components don't branch on theme — they just consume `theme.x`.
2. **Status colors are first-class**. `statusColorMap` lives in `src/design/theme.ts` and is the single place that defines `pending → warning`, etc. `Badge` consumes it.
3. **Lucide for icons, dropping Feather**. Lucide is actively maintained, has more glyphs, and exposes a tree-shakeable RN package. Migration cost is zero (we have no icon usage yet).
4. **`@gorhom/bottom-sheet` over the deprecated RN `Modal` for sheets**. Better gesture handling, established RN community standard. Adds `react-native-reanimated` + `react-native-gesture-handler` deps; both are needed anyway for nontrivial UI later.
5. **Themed icons via a token wrapper**. `<Icon name="calendar" color="brand.500" />` over `<Calendar color="#0F766E" />`. Forces consistency.
6. **No inline hex anywhere**. Lint rule. Yes, it's annoying. Yes, it pays off.
7. **No `left`/`right` in styles** — `start`/`end` is RTL-correct. Same lint rule philosophy.
8. **Brand assets are placeholders for now**. `wordmark-en.svg`, `wordmark-ar.svg`, `mark.svg` ship as crude placeholders so layout work isn't blocked on a designer. Real assets land in a `brand-assets-final` PR before launch.
9. **Dev showcase from day one**. The `/dev/design-system` screen renders every component in every theme × locale combination. Catches RTL bugs and dark-mode mistakes during normal development without requiring per-feature visual review.
10. **Time rendering goes through `useDisplayTimezone`**. The `Time` and `DateRange` components in this design system don't take a `Date`/`timestamptz` directly — they take a `timestamptz` plus a context (`'public-booking' | 'admin' | 'customer'`) and resolve the display zone via `useDisplayTimezone()` (defined in the `setup-app-shell` change). Lint rule rejects raw `new Date(x).toLocaleString(...)` inside components.
