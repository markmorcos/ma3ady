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

// Playwright is installed globally on the build-tooling container but
// not as a workspace dep — find it via `npm root -g` and require it
// out of that absolute path so this script works without bloating
// package.json. If the global install isn't there either, the error
// from createRequire below will say so clearly.
const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const require = createRequire(`${globalRoot}/_/`);
const { chromium } = require('playwright');
import { mkdir, readFile, writeFile, copyFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
      await unlink(tmp).catch(() => {});
    }

    await context.close();
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
