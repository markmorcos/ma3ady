# Design

## Context

Two separate jobs collide at the wildcard subdomain: rendering a tenant brand page when somebody pastes a `<slug>.ma3ady.com` link, and bouncing a `/manage/<token>` universal link into the mobile app. Both are server-side concerns (we need `Host` header parsing and universal-link configs); both want to be deployed as a single artifact for ops simplicity.

A tiny Deno server hits the sweet spot: Hello-world simple, async by default, modern stdlib, deploys exactly like any Docker image. Mark already has Deno tooling for the marketing site's legal renderer, so the runtime isn't new.

## Goals

- Single Docker image serves all `<slug>.ma3ady.com` hosts.
- Sub-100ms response time for tenant lookups (cached).
- Universal links work on iOS and Android once production bundles ship.
- 404s for unknown slugs are friendly.
- No business logic on this server — it's render-and-bounce only.

## Non-Goals

- Any actual booking UI. Bookings live exclusively in the mobile app.
- Authenticated user surfaces (no sign-in here).
- Per-tenant CMS / custom pages. The page is templated; tenants don't author custom HTML.
- Analytics on this surface (defer; mobile app analytics is enough).

## Decisions

1. **Deno over Node**. Already in the stack for marketing's legal renderer. Built-in TS, no `package.json`. Smaller image.
2. **Server-rendered HTML, no client framework**. Same reasons as the marketing site.
3. **Anon key, not service role**. The tenant lookup reads only public columns of `tenants`; the public-readable RLS policy already permits this. Never expose service role here.
4. **In-memory LRU cache, 60s TTL**. Eliminates the Supabase round-trip for the >99% of requests where the tenant exists. 60s is short enough that brand color edits propagate quickly. Per-pod cache (small N), no Redis.
5. **Manage redirect page is dumb**. It tries the deep link via meta-refresh, falls back to App Store / Play Store badges. Server doesn't try to "verify" the token (verification happens in the mobile app via `verify_manage_token`).
6. **Universal links declared in `apple-app-site-association` and `assetlinks.json`**. iOS and Android both handle the swap from web URL to deep link. Web URLs that match the patterns automatically open the app if installed.
7. **One image for both surfaces**. The marketing site (`ma3ady.com`) and tenant landing (`*.ma3ady.com`) are deployed as separate services even though they're conceptually similar — different ingress hosts, different cache rules, different deploy cadences. Combining them adds Host-routing complexity for marginal savings.
8. **No admin override for tenant landing pages in v1**. Tenants get the brand color + name + logo. Custom landing copy / hero text / images come later as a "Pages" feature.
