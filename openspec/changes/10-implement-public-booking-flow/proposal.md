# Implement public booking flow

## Why

The customer side: anonymous browsing of a tenant's services, slot picking, and booking with name + email + optional phone — no sign-in required. This is the primary user-facing flow ma3ady ships. After booking, the customer receives a manage-token deep link that lets them open the app to a manage screen and cancel/reschedule without signing in.

## What Changes

- **ADDED** route group `app/(public)/[tenantSlug]/`:
  - `_layout.tsx` — tenant context loader (reads slug param, calls `getTenantBySlug`, renders branded header)
  - `index.tsx` — services list
  - `[serviceId]/slots.tsx` — calendar + day strip with available slots from `compute_available_slots`
  - `[serviceId]/book.tsx` — guest details form (name, email, phone optional, notes optional, ToS checkbox)
  - `[serviceId]/confirmation/[appointmentId].tsx` — confirmation with manage link, "Add to my account" CTA prompting Google sign-in
- **ADDED** `app/manage/[token].tsx` — anonymous manage screen (deep-linked from email/WhatsApp). Calls `verify_manage_token`, shows appointment, offers cancel + reschedule actions
- **ADDED** universal-link / deep-link handler:
  - dev: `exp://...` URLs work via Expo dev client
  - prod (later): `ma3ady://manage/<token>` and `https://ma3ady.com/manage/<token>` (universal link)
- **ADDED** `src/services/api/booking.ts` already covers `bookAppointment`; this change adds `verifyManageToken`, `cancelByToken`, `rescheduleByToken`
- **ADDED** Edge Function `manage-appointment/`:
  - Input: `{ token, action: 'cancel' | 'reschedule', new_starts_at? }`
  - Verifies token via `verify_manage_token`, performs action, triggers notifications (mock dispatch in this phase)
- **ADDED** components: `<TenantHeader>`, `<ServiceCard>`, `<SlotGrid>`, `<DayStrip>`, `<BookingSummary>`
- **ADDED** TanStack Query: `pnpm add @tanstack/react-query` + `<QueryClientProvider>` in root layout

## Impact

- Affects `public-booking` capability (initial spec).
- Required by changes 13 (reschedule/cancel reuse the manage Edge Function), 14 (notifications fire from booking actions).
- All flows work in Expo Go.
