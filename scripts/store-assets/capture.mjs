#!/usr/bin/env node
/*
 * Renders the Play Store assets via headless Chromium.
 *
 * For each (screen, locale) pair, opens the screen's HTML with the
 * matching `lang` + `dir` substituted into the markup, screenshots at
 * 1080×2400 (Play recommended phone size), and writes to
 * assets/store/screenshots/play/<locale>/0N-<screen>.png.
 *
 * Also renders the 1024×500 Play feature graphic from
 * feature-graphic.html.
 *
 * Run from repo root:
 *   node scripts/store-assets/capture.mjs
 */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Playwright is installed globally on the build-tooling container but
// not as a workspace dep — find it via `npm root -g` and require it
// out of that absolute path so this script works without bloating
// package.json. If the global install isn't there either, the error
// from createRequire below will say so clearly.
const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const require = createRequire(`${globalRoot}/_/`);
const { chromium } = require('playwright');

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const OUT_ROOT = join(REPO_ROOT, 'assets', 'store');

const SCREENS = [
  { id: 'today', file: 'today.html', index: 1 },
  { id: 'booking', file: 'booking.html', index: 2 },
  { id: 'reminders', file: 'reminders.html', index: 3 },
];
const LOCALES = [
  { code: 'en', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
];

// 1080×2160 = aspect 1:2 exactly, which is the Play Store limit
// ("longer side cannot exceed 2× the shorter side"). Anything taller
// (e.g. 1080×2400 = 1:2.22) gets rejected on upload.
const PHONE_W = 1080;
const PHONE_H = 2160;
const FEATURE_W = 1024;
const FEATURE_H = 500;

// Tablet slots in Play Console are optional; supplying them lets the
// listing render on tablet form-factor previews instead of a pillarboxed
// phone shot. Since the app is mobile-first (openspec/project.md §2),
// the honest move is to composite the already-rendered phone screenshot
// onto a tablet-sized cream canvas with a soft shadow — it reads as
// "the mobile app on a bigger screen" rather than fabricating a tablet
// UI that doesn't exist.
const TABLETS = [
  // 1200×1920 = 10:16 portrait, classic 7" tablet aspect.
  { id: '7in', label: 'tablet-7', width: 1200, height: 1920, phoneScale: 0.86 },
  // 1600×2560 = 10:16 portrait, classic 10" tablet aspect.
  { id: '10in', label: 'tablet-10', width: 1600, height: 2560, phoneScale: 0.9 },
];

async function renderToTemp(file, locale, dir) {
  // Templates have placeholder tokens LOCALE / DIR on <html>; substitute
  // before render so each shot gets the right lang + writing direction.
  const src = await readFile(join(__dirname, file), 'utf8');
  const html = src.replace(/lang="LOCALE"/g, `lang="${locale}"`).replace(/dir="DIR"/g, `dir="${dir}"`);
  const tmp = join(__dirname, `.tmp.${locale}.${file}`);
  await writeFile(tmp, html, 'utf8');
  return tmp;
}

async function ensureDir(p) {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

async function main() {
  const browser = await chromium.launch();

  // ---- phone screenshots ----

  for (const locale of LOCALES) {
    const outDir = join(OUT_ROOT, 'screenshots', 'play', locale.code);
    await ensureDir(outDir);

    const context = await browser.newContext({
      viewport: { width: PHONE_W, height: PHONE_H },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const screen of SCREENS) {
      const tmp = await renderToTemp(screen.file, locale.code, locale.dir);
      const url = `file://${tmp}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      // Belt-and-braces wait for fonts so first paint isn't a flash of
      // fallback.
      await page.evaluate(() => document.fonts && document.fonts.ready);

      const outFile = join(
        outDir,
        `${String(screen.index).padStart(2, '0')}-${screen.id}.png`,
      );
      await page.screenshot({
        path: outFile,
        clip: { x: 0, y: 0, width: PHONE_W, height: PHONE_H },
        omitBackground: false,
      });
      console.log(`✓ ${outFile.replace(REPO_ROOT + '/', '')}`);
      await unlink(tmp).catch(() => { });
    }

    await context.close();
  }

  // ---- tablet composites ----

  // Each tablet PNG is the phone screenshot dropped onto a cream
  // canvas at the tablet's aspect, with a rounded corner radius and a
  // soft drop shadow so it reads as "the mobile app on a tablet" and
  // not a stretched phone capture. Both the 7" and 10" tablet slots
  // in Play Console accept anything between 320–3840 px on a side
  // (with the ≤2× rule) — 1200×1920 and 1600×2560 are the standard
  // 10:16 portrait shapes for those form factors.

  for (const tablet of TABLETS) {
    const phoneW = Math.round(PHONE_W * (tablet.height * tablet.phoneScale) / PHONE_H);
    const phoneH = Math.round(tablet.height * tablet.phoneScale);

    for (const locale of LOCALES) {
      const outDir = join(OUT_ROOT, 'screenshots', 'play', locale.code, tablet.label);
      await ensureDir(outDir);

      const context = await browser.newContext({
        viewport: { width: tablet.width, height: tablet.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      for (const screen of SCREENS) {
        const phoneFile = join(
          OUT_ROOT, 'screenshots', 'play', locale.code,
          `${String(screen.index).padStart(2, '0')}-${screen.id}.png`,
        );
        if (!existsSync(phoneFile)) {
          throw new Error(`Phone screenshot missing: ${phoneFile}. Run phone pass first.`);
        }

        // Chromium refuses file:// resource loads from a page that was
        // injected via setContent() (origin is about:blank). Write the
        // wrapper to a temp file in __dirname so its origin becomes
        // file:// and it's allowed to embed the phone PNG.
        const html = `<!DOCTYPE html>
<html lang="${locale.code}" dir="${locale.dir}">
<head><meta charset="UTF-8"/><style>
  html, body { margin: 0; padding: 0; width: ${tablet.width}px; height: ${tablet.height}px; }
  body {
    background:
      radial-gradient(at 22% 14%, rgba(20, 184, 166, 0.10), transparent 55%),
      radial-gradient(at 80% 85%, rgba(15, 118, 110, 0.10), transparent 55%),
      #FAFAF9;
    display: flex; align-items: center; justify-content: center;
  }
  .phone {
    width: ${phoneW}px; height: ${phoneH}px;
    border-radius: 36px;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 24px 80px rgba(15, 23, 42, 0.18),
      0 8px 24px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    background: #FFF;
  }
  .phone img { width: 100%; height: 100%; display: block; }
</style></head>
<body>
  <div class="phone"><img src="file://${phoneFile}" alt=""/></div>
</body>
</html>`;
        const tmpWrap = join(__dirname, `.tmp.${tablet.label}.${locale.code}.${screen.id}.html`);
        await writeFile(tmpWrap, html, 'utf8');
        await page.goto(`file://${tmpWrap}`, { waitUntil: 'networkidle' });
        // setContent-with-network-idle doesn't reliably wait for an <img>
        // to decode; do it explicitly.
        await page.evaluate(() => {
          const img = document.querySelector('.phone img');
          return img.complete ? Promise.resolve() : new Promise((r) => (img.onload = r));
        });

        const outFile = join(
          outDir,
          `${String(screen.index).padStart(2, '0')}-${screen.id}.png`,
        );
        await page.screenshot({
          path: outFile,
          clip: { x: 0, y: 0, width: tablet.width, height: tablet.height },
          omitBackground: false,
        });
        console.log(`✓ ${outFile.replace(REPO_ROOT + '/', '')}`);
        await unlink(tmpWrap).catch(() => { });
      }

      await context.close();
    }
  }

  // ---- feature graphic ----

  {
    const context = await browser.newContext({
      viewport: { width: FEATURE_W, height: FEATURE_H },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const url = `file://${join(__dirname, 'feature-graphic.html')}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const outFile = join(OUT_ROOT, 'play-feature-graphic.png');
    await page.screenshot({
      path: outFile,
      clip: { x: 0, y: 0, width: FEATURE_W, height: FEATURE_H },
      omitBackground: false,
    });
    console.log(`✓ ${outFile.replace(REPO_ROOT + '/', '')}`);
    await context.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
