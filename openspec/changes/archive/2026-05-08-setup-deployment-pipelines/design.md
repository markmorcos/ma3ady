# Design

## Context

We mirror stminaconnect's pipelines exactly, with adjustments for ma3ady's surfaces (no per-feature push-deploy, but a tenant-landing service that stminaconnect doesn't have).

## Goals

- A push to `main` that touches `marketing/` lands on `ma3ady.com` within 5 minutes.
- A migration on `main` lands on the preview Supabase project, then (if green) on production.
- Mobile builds are explicit, not on every push (cost + accidental-publish protection).
- The pipelines are debuggable from the GitHub Actions UI alone.

## Non-Goals

- Auto-rollback. Rollback is a human decision involving a re-deploy with a prior SHA. Documented in the runbook.
- Canary deploys / blue-green. Defer; tenant scale doesn't justify.
- Mobile auto-publish to App Store / Play Store on every push. EAS Submit happens manually.
- Supabase preview branching (Supabase's branching feature) — defer; the two-project preview/prod model is enough.

## Decisions

1. **Sequential preview → prod, not parallel**. Catches breaking changes before they hit prod. The cost (5–10 minute delay) is worth it.
2. **`peter-evans/repository-dispatch@v2`** for marketing/tenant-landing — same action stminaconnect uses. Mark already has the `INFRASTRUCTURE_DISPATCH_TOKEN`.
3. **`workflow_dispatch` only for mobile builds**. Hitting "build" should be deliberate. Auto-build on every push to `main` would explode EAS quota and produce store-listing-noise.
4. **CI runs on every PR + every main push**. Catches regressions before merge and after.
5. **`db-lint` job**. Validates migration filenames match `NNN_snake_case.sql` and that each is parseable. Doesn't run them — that happens in the deploy workflow against preview.
6. **Secrets are per-environment**. Preview Supabase + production Supabase have separate `supabase secrets`. GitHub secrets are scoped to environments via GitHub's environment feature so only `deploy-production` can read prod secrets.
7. **Deployment runbook is part of the repo**, not Notion / Confluence. Lives next to the code; updates as part of code review.
8. **EAS production profile asserts `*_DISPATCHER=real`** as a pre-build step (already in the `setup-monorepo-and-tooling` change). Build-time fail beats production-time surprise.
9. **No GitHub Pages, no Vercel, no Netlify**. Per `project.md` §8 and Mark's pattern: Docker → GHCR → infra repo. Adding a third platform is unnecessary.
