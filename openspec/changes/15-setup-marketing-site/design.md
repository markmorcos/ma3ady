# Design

## Context

A marketing site for a pre-launch product is informational. It needs to: explain what ma3ady is, send people to the App Store / Play Store (eventually), and host privacy/terms. Plain HTML + CSS does this perfectly; a JS framework would be ceremony.

We mirror stminaconnect's stack and conventions: nginx-in-docker, Deno-rendered legal pages from markdown, deployment via the infrastructure repo dispatch.

## Goals

- Site loads in <500ms on a cold cache.
- Lighthouse scores ≥ 95 across all categories.
- Works without JavaScript.
- Translatable: EN + AR with a tiny language switcher.
- Easy to update copy without redeploying the mobile app.

## Non-Goals

- Blog (use a simple Astro setup later if needed; not v1).
- Authentication / member portal.
- Per-tenant marketing pages (the *tenant landing app* in change 16 covers that).
- A11y audit beyond automated checks (manual audit later when the design is finalized).

## Decisions

1. **Plain HTML, no framework**. Same reason stminaconnect did it. The site is going to change weekly, not hourly; a build step would slow us down.
2. **Locale by URL path**. `/` is English, `/ar/` is Arabic. Matches stminaconnect. `/en/` redirects to `/` for canonical URLs.
3. **`dir="rtl"` on the Arabic root element**. CSS uses logical properties (`margin-inline-start` etc.) plus a few `[dir="rtl"]` overrides where needed.
4. **Fonts self-hosted as woff2**. No Google Fonts CDN — privacy-friendly, faster cache.
5. **Images optimized at edit time, not build time**. We commit pre-optimized PNGs/WebPs.
6. **Legal pages from markdown**. Tenants and users read the same content; drafting in markdown is friendlier than HTML. The render task only runs locally / on push; the rendered HTML is committed.
7. **App Store badges grayed out until store listings ship**. "Coming soon" beats a broken link.
8. **CTA points at the demo tenant landing page** (change 16) for now. Once the app is published, the CTA flips to App Store / Play Store badges.
