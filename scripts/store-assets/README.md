# scripts/store-assets

Headless-Chromium generator for the Play Store screenshots and the
feature graphic. The store copy itself lives in
[`assets/store/listing.md`](../../assets/store/listing.md) — this
directory is just the visual asset pipeline.

## Layout

```
shared.css           # M3 tokens + utility classes (brand, status bar,
                     # cards, timeline, slot grid, reminders, banner,
                     # feature graphic). Mirrors openspec/project.md §1a.
today.html           # 1080×2160 mock — admin Today screen
booking.html         # 1080×2160 mock — public booking slot picker
reminders.html       # 1080×2160 mock — customer reminders feed
feature-graphic.html # 1024×500   — Play feature graphic
capture.mjs          # Playwright runner that renders each template
                     # in both `en` (LTR) and `ar` (RTL) and writes
                     # PNGs into assets/store/...
```

Each screen template has `lang="LOCALE"` and `dir="DIR"` placeholders
on its `<html>` tag that `capture.mjs` substitutes per pass, plus a
small `data-i18n="key"` mechanism in inline JS that swaps copy from
the `i18n` object based on the active locale.

## Why 1080×2160

Play Console rejects screenshots whose longer side is more than 2× the
shorter side. 1080×2160 sits exactly at that 1:2 limit (taller than
the common 16:9 of 1080×1920, shorter than the 1080×2400 you'd get
from a Pixel 6 native capture). Renders large enough in Play search
result previews without tripping the validator.

## Regenerate

From the repo root, with Playwright + Chromium available on PATH:

```
node scripts/store-assets/capture.mjs
```

On the build-tooling container Playwright is installed globally — the
script resolves it via `npm root -g`, so no workspace install needed.
Locally, either `npm i -g playwright` once (and `npx playwright
install chromium`), or move this directory under a workspace that
already depends on playwright.

Output paths (overwritten on each run):

```
assets/store/play-feature-graphic.png                 (1024×500)
assets/store/screenshots/play/{en,ar}/0N-*.png         (1080×2160, phone)
assets/store/screenshots/play/{en,ar}/tablet-7/0N-*.png   (1200×1920, 7" tablet)
assets/store/screenshots/play/{en,ar}/tablet-10/0N-*.png  (1600×2560, 10" tablet)
```

Tablet variants composite the rendered phone screenshot onto a
cream-with-soft-teal-gradient canvas with a drop shadow. The app is
mobile-first (`openspec/project.md §2`) — there's no separate tablet
UI to capture — so this composite honestly represents "your phone app
on a tablet". Skip the tablet slots in Play Console and Play pillarboxes
the phone shots on tablet previews with grey bars; supplying these
keeps the listing looking deliberate on tablet form factors.

## Adding a fourth screenshot

1. Drop `xyz.html` next to the others, modelling after one of the
   existing templates. Keep `lang="LOCALE"` / `dir="DIR"` and the
   `data-i18n` pattern so capture works in both locales.
2. Add an entry to the `SCREENS` array at the top of `capture.mjs`
   with the next sequential `index`.
3. Add the screen's caption + screen-name to the table in
   `assets/store/listing.md` §6 so the listing doc stays in sync with
   what's actually uploaded.
4. Re-run `node scripts/store-assets/capture.mjs`.
