# Design

## Context

Customers find a tenant via `<slug>.ma3ady.com` (marketing landing). Today that page has a single "Open in app" CTA — no fallback for customers who don't have the app installed. The result is a conversion funnel that drops customers at install-time.

The web booking surface adds a parallel path: a customer who clicks the link can browse services, see availability, and book — entirely in their browser, without an account. The submission produces a `manage_token` (sent via email) that lets them cancel or reschedule from the same browser later.

## Goals

- Customer can go from "click link" to "appointment confirmed" in under 60 seconds, no install, no sign-up.
- First-paint of the booking page is server-rendered: tenant name, services, brand color visible within 200ms.
- Same database, same RPCs as the mobile app. No data drift.
- en + ar with full RTL on Arabic, parity with mobile locale files.
- Per-tenant PWA manifest so "Add to home screen" produces a tenant-branded icon.
- Tenant SEO: each `<slug>.ma3ady.com/book` is indexable, has structured data, has tenant-specific meta tags.

## Non-Goals

- **Authenticated web flows** (admin tools, "My bookings" for signed-in users). Customer experience is intentionally guest-only on web; signed-in features stay mobile.
- **Web admin / staff surfaces.** The `(admin)` mode is mobile-only by design — staff operate the app on a phone behind the counter, not on a desktop browser.
- **Reusing the mobile component tree via Expo Web.** Tried that mentally; the bundle weight + RN-Web edge cases make a clean web-only stack faster.
- **Marketing page redesign.** This change adds `/book` and `/manage` to whatever the landing page already serves; the landing page itself stays in `setup-tenant-landing-app`'s scope.
- **Push notifications on web.** Email-only for confirmations; the mobile app handles push.

## Decisions

1. **Next.js 15 with App Router**, not Astro / Vite / SvelteKit. Reasons: best-in-class RSC for server-rendered tenant pages (which is most of the surface area), excellent i18n + middleware story for the `<slug>` subdomain routing, mature Vercel/Docker deployment story. The tradeoff is a heavier framework than Astro, but the dynamic parts (slot picker, booking submission) push us out of "static-only" territory anyway.

2. **Single Docker image serves all `<slug>.ma3ady.com`**. Tenant resolution at request time via the `Host` header → tenant lookup via Supabase anon key → render. Mirrors the mobile app's tenant-by-slug resolution. One image to deploy means one infrastructure dispatch, one set of secrets, one log stream.

3. **Anon Supabase access only.** The web flow never holds a user JWT — it's guest-only. Public RPCs (`compute_available_slots`, `book_appointment`, `verify_manage_token`) are already callable with the anon key per their SECURITY DEFINER setup.

4. **Manage tokens via URL, not session.** The customer's identity is "the holder of this URL". This matches the mobile flow exactly. Accidentally sharing a `/manage/<token>` URL is the customer's responsibility; tokens are bound to one appointment and expire when the appointment is cancelled.

5. **Locale resolution at the edge, not client.** The Next.js middleware reads `Accept-Language` and the `?lang=` query param, sets the appropriate variant in the request, and the rendered page comes back with the correct locale + `dir`. Avoids the flash-of-English-content issue.

6. **PWA manifest is per-tenant**, generated dynamically. Returns a `manifest.json` with the tenant's name, short_name, theme_color (from `brand_color`), background_color (white), and a single icon — the ma3ady wordmark on the tenant's brand color. Generated on the fly from the tenant row; no per-tenant build step.

7. **No "framework to render the form" debate; just plain HTML forms + a tiny client-side enhancement.** The booking form posts to a Next.js Route Handler that calls `book_appointment` server-side and renders the confirmation. Slot picker is a client component (needs interactivity). This keeps JS to ~10–15KB per page and works without JavaScript for everything except slot selection.

8. **Open-in-app banner is dismissible per session.** A non-intrusive bar at the top: "📱 Open in ma3ady app for faster booking" with deep link + dismiss. Banner state in `sessionStorage`. Customers who don't want the app aren't nagged across page navigations.

9. **Booking flow uses the tenant's locale by default**, the visitor's device locale as the fallback. If the visitor's `Accept-Language` is Arabic and the tenant's `default_locale` is English, we honor the visitor unless their locale isn't supported (en/ar only in v1).

10. **Static at build, dynamic at edge for tenant data.** Tenant row, services, available slots are dynamic — the customer should always see fresh data. But the page chrome (header, footer, locale switcher) can be cached.

## Out of scope explicitly

- A "search all tenants" page. Per `project.md`, ma3ady isn't a marketplace.
- Customer accounts on web. If a customer wants account features, they sign in on the app (existing path: claim-bookings on first sign-in promotes their guest history).
- Real-time slot availability via Supabase Realtime. The web page fetches slots once on load + on service-change. If a slot is taken between fetch and submit, the EXCLUDE constraint catches it server-side and we render a "this slot was just taken — pick another" error. Adding Realtime is a future optimization.
