# Design

## Context

Compliance is mostly a checklist task; the design decisions are about what to retain vs. anonymize, how account deletion handles tenant ownership, and when to cut the dev client.

## Goals

- Customers can export their data and delete their account from the app.
- Old data is anonymized on a schedule, not retained indefinitely.
- Production runs with native push, not in-app toasts.
- RLS isolation is verified by an automated suite, not by hope.
- Store listings are accurate (no rejection on resubmit).

## Non-Goals

- Analytics consent banner inside the app — not collecting PII for marketing in v1.
- A full SOC 2 audit. Defer.
- Cookie banner on the marketing site beyond a minimal consent if Resend pixels are added later. v1 has no third-party trackers on the marketing site.
- DSAR (data subject access request) automation beyond export+delete. Manual requests handled via support email.

## Decisions

1. **Retention: 90 days for cancelled, 18 months for no-show**. The first balances "did I really pay for this and not show up?" recall (you mostly remember within 3 months) against PII minimization. The second is a tenant-analytics window — chargeback windows, returning-customer detection.
2. **Anonymization, not deletion**. Tenant analytics still need the row count, just not the identifying fields. Hash the email so duplicates can be detected; null other PII.
3. **Sole-owner check before account deletion**. If a user is the only owner of `acme`, they can't just delete themselves and orphan the tenant. The Edge Function refuses with a clear error; the UI tells them to transfer ownership first.
4. **`export-my-data` returns JSON, not zip / CSV**. Easier to ship, easier to parse for the user. We can add CSV later.
5. **First dev client cuts here**, not earlier. Per `project.md` §2 we deferred as long as possible. Expo Go was sufficient through changes 1–17. Push notifications require a custom dev client; this is the natural cutover.
6. **`push_tokens` table is in this change, not earlier**. Push hardware doesn't exist in Expo Go (well, it does for the Expo Go push notification, but that's a different target id). Real device tokens come with the dev client. Cleanest to land the schema here.
7. **RLS pen-test fixture is a Jest suite**, not manual. Mark already runs Jest on every PR; integrating this means regressions can't slip in.
8. **Store listings live in `store/`** in the repo, not in App Store Connect alone. Versioned, reviewable, translatable.
9. **Submit to internal tracks first**, not direct to public. TestFlight + Play Console internal tracks let us validate one more pass with real native modules before public exposure.
