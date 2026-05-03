# Implement web booking surface

## Why

The v1 plan was mobile-only — customers reach `<slug>.ma3ady.com` (marketing landing) and the only booking path is "Open in app". That requires every customer to install ma3ady before they can book, which is a significant conversion drop for cold-acquisition use cases (someone discovering a clinic via Instagram has to go to the App Store, install, sign in, then book — 4 steps that compound to ~10% conversion).

Most direct competitors (Calendly, Booksy, OpenTable, Setmore, Doctolib) let you book in the browser. For ma3ady to be a reasonable alternative for tenants whose customers don't already have a relationship with them, we need a web booking flow.

This change adds `<slug>.ma3ady.com/book` — a fully-functional booking surface served from the existing tenant-landing app. No app install required. Same Postgres functions (`compute_available_slots`, `book_appointment`, `verify_manage_token`) as the mobile app — so the data model is unchanged and parity is automatic.

This change is **additive**: the mobile booking flow remains the canonical experience for repeat customers / signed-in users; the web flow is for first-time / one-off bookers and for customers who simply prefer the browser.

## What Changes

- **ADDED** capability `web-booking-surface` (was deferred; promoted to active in `openspec/config.yaml`)
- **ADDED** routes inside the existing `tenant-landing-app` (the Docker image serving `<slug>.ma3ady.com`):
  - `<slug>.ma3ady.com/book` — service picker + slot picker + booking form
  - `<slug>.ma3ady.com/book/confirm` — confirmation screen (post-submit) with "add to calendar" + manage link
  - `<slug>.ma3ady.com/manage/<token>` — guest manage flow (cancel / reschedule) backed by the existing `manage-appointment` Edge Function
- **ADDED** a small in-page web-booking component bundle written in plain TypeScript + minimal CSS (no React Native Web). Uses `@supabase/supabase-js` directly with the anon key.
- **ADDED** i18n (en + ar) reusing the locale JSON files from `src/i18n/locales/` so strings stay in sync between mobile and web. Locale via `Accept-Language` header at the edge with `?lang=ar` override.
- **ADDED** RTL support via `dir="rtl"` on `<html>` for Arabic, mirroring the mobile RTL bootstrap.
- **ADDED** a session-only timezone toggle (per `project.md` §10): the booking page renders in the tenant's TZ by default, with a header chip to flip to the visitor's device TZ. Stored in `sessionStorage`.
- **ADDED** brand-aware rendering: tenant `name`, `brand_color` come from the public `tenants` row (anon-readable per RLS).
- **ADDED** "Open in app" affordance on every page — small banner / CTA so customers who DO have the app installed can deep-link in. Web flow remains fully usable without it.
- **ADDED** progressive-enhancement PWA manifest per tenant: `<slug>.ma3ady.com/manifest.json` derived from the tenant's `name` + `brand_color`. Lets users "Add to Home Screen" → home-screen icon shows the tenant's name + color (closest we get to per-tenant branded apps without building per-tenant published apps).
- **ADDED** SEO metadata (`<title>`, OpenGraph, JSON-LD `LocalBusiness` + `Service` schema) per tenant to the landing page so the tenant gets some indexable presence at their subdomain.

## Impact

- Affects `web-booking-surface` capability (initial spec).
- Affects the `setup-tenant-landing-app` change deliverable — that change creates the basic tenant landing image; this change extends it with the booking + manage routes. They can ship together if implemented in sequence; if `setup-tenant-landing-app` ships first as a marketing-only image, this change adds the booking layer on top.
- Reuses RPCs/Edge Functions already shipped by `define-services-and-appointments`, `define-availability-rules`, and `implement-public-booking-flow`. No new server-side capability is needed.
- Required by no other capability; web booking is purely additive.
- Reduces conversion friction for cold-acquisition tenants from ~4 steps to ~2 (browse subdomain → fill form). Estimated conversion lift on first-time bookings: ~3–5×.

## Post-apply notes

This change deliberately uses **plain TypeScript + minimal CSS** rather than reusing Expo Web with the mobile component tree. Reasoning:

- The mobile components import RN-specific modules (`expo-router`, `react-native-reanimated`, `react-native-svg`, etc.) that produce heavy JS bundles when run on web — bad for SEO and first-paint on mobile browsers.
- The booking flow is small (~5 components: service picker, slot picker, booking form, confirmation, manage). Rewriting them as semantic HTML + a few CSS classes is faster than wrestling RN-Web's quirks.
- HTML semantics give us accessible, keyboard-navigable forms for free.
- Server-rendered for the first paint (Next.js or similar) means the customer sees the tenant's name + services within 100–200ms of clicking the link, before any JS hydrates.

Stack choice (decided in design.md): Next.js 15 (App Router, RSC for the static parts, client islands for the slot picker + form), deployed as a single Docker image alongside the existing tenant-landing app.
