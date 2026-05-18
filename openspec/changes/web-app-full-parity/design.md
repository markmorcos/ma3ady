# Design

## Context

Ma3ady is an Expo Router + React Native app backed by Supabase. The repo already ships a Next.js workspace (`tenant-landing/`) for the anonymous public booking surface and marketing pages on `ma3ady.com`. Every authenticated surface — customer "My bookings" + the entire tenant admin — is mobile-only.

The user has confirmed:

1. **Strict mobile parity** on web. No new features.
2. **Hybrid stack.** Public booking on `ma3ady.com` stays Next.js (tenant-landing untouched). Authenticated app on `app.ma3ady.com` is React Native for Web (RNW) via Expo Router's web export.
3. **Single source tree.** Mobile and web ship from the same `app/` + `src/`. Platform splits via Expo's `.web.tsx` / `.native.tsx` extensions for the handful of files that wrap a native-only module.
4. **`web/` workspace contains only deployment artifacts** — no application source code.

This design pins down (a) the platform-extension strategy, (b) the auth/session model on web, (c) the responsive nav strategy, (d) deployment, and (e) the boot sequence on web. It also closes the open questions the user raised about universal-link handling and locale/RTL.

## Goals

- One `app/` tree powers mobile and web. The `(auth)`, `(onboarding)`, `(app)`, `(admin)` route groups render identically on both.
- Every native-only module is wrapped at exactly one file, replaced via platform extensions. No `Platform.OS === 'web'` checks bleeding through feature code.
- Web sign-in is Google-only and uses the same Supabase project; web session persists via `localStorage`.
- Cold-start TTI on web is comparable to a typical static SPA (sub-2s on a fresh tab on broadband).
- Deployment matches the tenant-landing pattern exactly — same Dockerfile shape, same GH Actions trigger, same k8s ingress structure.

## Non-Goals

- Web Push notifications.
- Server-side rendering of authenticated routes.
- A second OAuth flow or a different auth provider on web.
- Migrating tenant-landing to RNW, or moving the public booking flow off `ma3ady.com`.
- Per-tenant subdomains for the authenticated app.

## Decisions

### 1. One Expo Router codebase, web enabled via Metro

We will **not** create a new application workspace. The existing `app/` directory is the source of routes for both mobile and web. The repo's `app.json` already declares `"web": { "bundler": "metro" }`, and Expo Router supports web export with that configuration.

`web/` at the repo root holds only deployment-time artifacts:

```
web/
  Dockerfile
  nginx.conf
  deployment.yaml
  deployment.preview.yaml
  README.md
```

**Why not a separate Expo project** that imports `src/` from a workspace package? Two reasons: (a) it would duplicate the Expo Router tree (every route file would need a wrapper that re-exports from the mobile tree), and (b) it would diverge type generation, lint config, and test setup. One source tree is the lowest-friction reuse.

**Why not Next.js for the authenticated app?** The user explicitly chose RNW for component/state reuse. The mobile codebase already has a complete component library (`src/components`), design system (`src/design`), zustand stores (`src/state`), boot sequence (`src/boot`), Supabase client (`src/services/api/supabase.ts`), i18n bootstrap (`src/i18n`), and feature modules (`src/features`). Re-implementing all of this in Next.js would essentially double the codebase. The SEO/SSR argument doesn't apply behind auth.

### 2. Platform extensions — exactly seven split modules

The following modules wrap native-only APIs and need platform splits. Everything else is platform-agnostic and stays a single file.

| Module | `.native` impl | `.web` impl |
|---|---|---|
| `src/services/api/supabase.ts` | `expo-secure-store`-backed storage | `localStorage` storage |
| `src/services/notifications/registerPushToken.ts` | `expo-notifications` register + insert into `expo_push_tokens` | no-op returning `null` |
| `src/services/share.ts` (new wrapper) | `expo-sharing` | `navigator.share` with copy-link fallback |
| `src/services/clipboard.ts` (new wrapper) | `expo-clipboard` | `navigator.clipboard.writeText` |
| `src/components/DateTimePicker.tsx` (or wherever the picker is wrapped) | `@react-native-community/datetimepicker` | `<input type="datetime-local">` adapter that emits the same `(date: Date) => void` shape |
| `src/components/BottomSheet.tsx` (wrapper around `@gorhom/bottom-sheet` usages) | `@gorhom/bottom-sheet` | centered modal with backdrop |
| `src/i18n/applyDirection.ts` | `I18nManager.forceRTL(isRTL)` + `Updates.reloadAsync()` | `document.documentElement.dir = isRTL ? 'rtl' : 'ltr'` |

**No `Platform.OS === 'web'` branches inside feature code.** If a feature needs to vary by platform, the variation lives in a wrapper file with the `.web` / `.native` split.

`react-native-qrcode-svg` is already SVG-based; it works on RNW unchanged. `lucide-react-native` works on RNW unchanged. `react-native-reanimated` and `react-native-gesture-handler` work on web via their respective web runtimes — the existing animations (M3 pill indicator, AnimatedCheck, heatmap drag-paint) survive without code changes; the design.md of `design-system-m3-revamp` already constrains us to library choices that ship web shims.

### 3. Auth on web — direct redirect, no auth-subdomain bounce

Mobile flow today:

```
app → expo-auth-session → https://accounts.google.com → https://auth.ma3ady.com/callback?code=...
     → auth.ma3ady.com bounces to ma3ady://auth/callback?code=...
     → app/auth/callback.tsx exchanges code for session
```

The auth subdomain exists to bridge from Google's required HTTPS redirect URI to the mobile app's `ma3ady://` deep-link scheme.

On web we don't need that bridge — the browser is already at an HTTPS origin. We register `https://app.ma3ady.com/auth/callback` and `https://preview-app.ma3ady.com/auth/callback` as additional authorized redirect URIs in Google Cloud Console and in the Supabase project's auth settings. The web sign-in then calls:

```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'openid email profile',
  },
});
```

Supabase handles the redirect to Google, the callback to its own `/auth/v1/callback`, and the final redirect back to `app.ma3ady.com/auth/callback?code=...`. With `detectSessionInUrl: true` on the web client, Supabase auto-exchanges the code on page load — the callback screen only needs to wait for `authStore.session` to populate, then route onward, identically to mobile.

The 10-second timeout requirement in `auth` spec carries over: web wraps the same `exchangeCodeForSession` (or, with `detectSessionInUrl: true`, a `session` event from `onAuthStateChange`) in a 10s race.

**Why not keep using `auth.ma3ady.com/callback` for web too?** It would add a pointless redirect hop, and the existing bounce logic translates to `ma3ady://` which is wrong for a browser. Two registered redirect URIs (one for mobile via the bridge, one for web direct) is simpler.

### 4. Session storage — `localStorage`, not cookies

Supabase JS supports both. We use `localStorage` because:

- The Supabase JS client already supports `localStorage` natively with no extra config (it's the default when no `storage` is specified).
- The mobile client already uses a custom storage adapter (`SecureStore`), so a platform-split `.web.ts` that omits the `storage` option (letting Supabase default to `localStorage`) is the smallest possible diff.
- Authenticated routes don't need to be SSRed, so cookie-based session sharing with a server isn't required.
- Cookies require careful `SameSite` + `Secure` + cross-subdomain handling; `localStorage` avoids all of that.

`detectSessionInUrl: true` on web (and `false` on native, as today) is the other web-specific setting.

### 5. Responsive nav — left rail ≥ 768px, bottom tabs below

The mobile `(app)/(tabs)/_layout.tsx` and `(admin)/(tabs)/_layout.tsx` currently use Expo Router's `Tabs`. On web, `Tabs` renders as a bottom tab bar via RNW's component mapping — which is fine for mobile-width viewports but wrong for desktop.

We wrap both layouts in a `<AppShell>` component that platform-splits:

- **`AppShell.native.tsx`** — a thin pass-through that just renders `children`. The existing `<Tabs>` is unaffected.
- **`AppShell.web.tsx`** — reads viewport width via `useWindowDimensions`. ≥ 768px renders a 240px left rail with the same tab destinations, a top app bar for screen titles, and the active route's content in the main column. < 768px keeps the bottom tab bar (so mobile browsers feel native).

Tab destinations come from a single `getTabs(role)` helper that both `AppShell.web.tsx` and the existing `Tabs` config consume — no duplication.

`react-native-safe-area-context` works on web (returns zero insets); no change needed.

### 6. URL shape on web

- Customer routes: `/sign-in`, `/`, `/bookings`, `/bookings/:id`, `/bookings/:id/reschedule`, `/settings`, `/data-and-privacy`, `/tenants/picker`, `/onboarding/welcome|claim-slug|joined`, `/auth/callback`.
- Admin routes: `/admin`, `/admin/upcoming`, `/admin/services`, `/admin/service/new`, `/admin/service/:id`, `/admin/availability`, `/admin/audit-log`, `/admin/settings`, `/admin/settings/timezone`, `/admin/appointment/:id`, `/admin/appointment/:id/reschedule`, `/admin/dev-tools/errors`, `/admin/dev-tools/error/:id`.

Expo Router's group-prefix paths (`(app)`, `(admin)`) are URL-invisible by default, which gives us these clean URLs without any rewrite layer.

**Active tenant is in state, not in the URL** for `/admin/*`. The tenant picker (`/tenants/picker`) sets `useTenantStore.tenantId`. RLS scopes everything server-side. This matches mobile, where `app/(admin)/...` reads from `tenantStore` rather than a URL slug.

### 7. Boot sequence on web

The existing boot phases (`i18n → theme → auth → tenant → ready`) work as-is on web. Two small additions:

- The `i18n` phase, after picking a locale, calls `applyDirection(locale)` which (on web) sets `document.documentElement.dir`.
- The `auth` phase, on web, also calls `supabase.auth.getSession()` to pick up the persisted session from `localStorage` (mobile already does the equivalent via `SecureStore`). `onAuthStateChange` subscribes for the OAuth callback handoff.

The 5s per-phase timeout and the splash behavior carry over; on web, "splash" is the existing static loading state in `app/_layout.tsx` (no native splash on web — just a CSS-backed initial paint).

### 8. Deployment

Patterned exactly on `tenant-landing/`:

- **`web/Dockerfile`** — two-stage. Builder: `node:20-alpine`, install pnpm, `pnpm install --frozen-lockfile`, `pnpm expo export --platform web`. Runtime: `nginx:alpine` with a custom `nginx.conf` that serves the static output and SPA-falls-back to `/index.html` for unknown paths.
- **`web/deployment.yaml` / `web/deployment.preview.yaml`** — same structure as tenant-landing's manifests, ingress hosts `app.ma3ady.com` / `preview-app.ma3ady.com`, namespaces `ma3ady` / `ma3ady-preview`.
- **`.github/workflows/deploy-web.yml`** — push-to-main trigger with path filters covering `app/**`, `src/**`, `assets/**`, `web/**`, root `app.json`, `package.json`, `pnpm-lock.yaml`. Builds + pushes the image, dispatches to the infrastructure repo, preview-then-production gated by preview success (mirroring the tenant-landing workflow).
- **Env vars on web** — exactly the same `EXPO_PUBLIC_*` vars the mobile build uses for Supabase URL and anon key; injected at build time by the GH Actions runner from the same secrets the mobile build reads.

We do not need `SUPABASE_SERVICE_ROLE_KEY` on the web image — every operation goes through the user's JWT and the same RLS policies that scope the mobile app. (This is also the rule for tenant-landing's anonymous flow; for the authenticated web app it's even cleaner.)

### 9. Universal Links — add `app.ma3ady.com` to associated domains

`app.json` currently lists `applinks:ma3ady.com` and `applinks:preview.ma3ady.com` so the mobile app intercepts `/t/<slug>` and `/manage/<token>` links. We add `applinks:app.ma3ady.com` and `applinks:preview-app.ma3ady.com` (plus matching Android `intentFilters`) so that:

- An emailed manage-token link in the future that targets `app.ma3ady.com/manage/...` opens the mobile app where installed.
- A user who follows a sign-in link from a desktop newsletter on their phone lands in the app, not Safari.

`web/public/.well-known/apple-app-site-association` and `web/public/.well-known/assetlinks.json` are served by the web nginx image (same structure as the tenant-landing equivalents, repointed at `app.ma3ady.com`).

**This does not interfere with web users on desktop.** Universal Links only redirect to the native app on iOS/Android devices that have the app installed; on every other surface the URL loads in the browser as expected.

### 10. RTL on web

Native mobile uses `I18nManager.forceRTL` + an Expo `Updates.reloadAsync()` because RN's layout system needs to re-evaluate flex `start`/`end` semantics after a direction flip. RNW honours the DOM's `dir` attribute and CSS logical properties without a reload — setting `document.documentElement.dir = 'rtl'` is enough.

Source files use `start`/`end` flex properties throughout (per `project.md` §1c), so no per-component changes are needed for RTL on web. The `src/i18n/applyDirection.ts` wrapper isolates the two implementations.

## Open Questions Resolved

- **Universal Links interference** → adding `app.ma3ady.com` to `associatedDomains` is correct and harmless; native interception only kicks in on devices with the app installed.
- **OAuth redirect URI strategy** → register `app.ma3ady.com/auth/callback` directly; don't reuse the `auth.ma3ady.com` bridge for web.
- **Cookie vs `localStorage` session** → `localStorage`. Simpler, no SSR requirement.
- **Workspace structure** → one `app/` tree, platform extensions for the seven native-only modules, `web/` for deploy artifacts only.
- **Responsive nav threshold** → 768px. Below = bottom tabs; above = left rail.
- **OAuth bounce subdomain** → unchanged for mobile; web doesn't use it.

## Alternatives Considered

- **Next.js for the authenticated app** — rejected. Would duplicate the component library, state stores, design system, and feature modules. The user picked RNW explicitly.
- **A separate Expo workspace for web** that imports from the mobile workspace — rejected. Forces every route file to be re-exported and breaks Expo Router's file-system routing convention.
- **Cookie-based auth via Supabase SSR helpers** — rejected. Authenticated routes are SPA-only; cookies would add cross-origin and `SameSite` complexity for zero benefit.
- **Migrate tenant-landing's public booking to RNW too** — rejected. Public booking benefits massively from SSR (SEO, share-link previews, first-paint performance). It already works well in tenant-landing.
- **Subdomain-per-tenant for admin** (`<slug>.ma3ady.com/admin`) — rejected. The wildcard infrastructure is deferred, and tenant context via `useTenantStore` already works on mobile; web has no reason to diverge.
