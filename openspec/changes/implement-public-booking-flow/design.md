# Design

## Context

This is the marquee user flow. It must be fast (no auth latency), clear (no jargon), and tolerant (slot collisions, network blips, slow Edge Functions). Anonymous booking is not just a feature — it's the default experience.

## Goals

- A first-time visitor at `<tenant>.ma3ady.com` (deep-linked into the app) can book in under 30 seconds.
- The manage link in the confirmation email/WhatsApp opens the app directly to the manage screen — no sign-in friction.
- Slot collisions resolve gracefully: the user sees "that one just got taken, here are nearby alternatives" instead of a generic error.
- Adding the booking to a Google account is a 1-tap option, not a requirement.

## Non-Goals

- Web booking surface — there is none. The mobile app is the booking surface.
- Calendar integrations.
- Multi-service packages / bundles.
- Recurring bookings (book every Monday for 6 weeks) — defer.

## Decisions

1. **TanStack Query over hand-rolled fetch hooks**. Caching, retries, refetch-on-focus, and stale-while-revalidate are all useful for a network-heavy flow. The cost of one dependency is low.
2. **Manage tokens travel in the URL path, not a query param**. URLs in WhatsApp/email get truncated or wrapped; path segments survive better than `?token=...`. Plus path is easier to deep-link match.
3. **Confirmation screen passes the plaintext token via query for the "manage" CTA**. Yes, the token is sensitive — but the confirmation screen is presented exactly to the booker, on their device, immediately after booking. It's not stored beyond that view. The sent emails carry the token too; one extra place is acceptable.
4. **No optimistic update on booking**. The slot might already be taken; we wait for the server. Snappy enough at sub-second.
5. **DayStrip + SlotGrid over a full month calendar**. Mobile-first. A month grid would dominate the screen and force a second tap to see times. The strip + per-day grid is faster to scan.
6. **Tenant header is branded with `tenants.brand_color`**. First moment of brand reinforcement. The wordmark is the tenant name set in our type. No per-tenant logos in v1 (per `project.md` §1f — no storage layer); we'll revisit when `storage-and-uploads` lands.
7. **Empty states are first-class**. "No slots this week" + "Try next week" CTA. No spinner death.
8. **Deep links use `ma3ady://manage/<token>`** in production and the Expo dev URL in development. The route file `app/manage/[token].tsx` works in both because Expo Router handles both schemes.
9. **The confirmation screen sets a flag in TanStack Query cache to invalidate "My bookings" the next time the user authenticates** — so a guest who books and then signs in immediately sees their booking via the claim flow.
