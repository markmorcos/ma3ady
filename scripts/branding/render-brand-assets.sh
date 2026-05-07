#!/usr/bin/env bash
# Render PNG raster assets for the ma3ady mark + wordmark.
#
# Outputs:
#   tenant-landing/public/favicon.ico
#   tenant-landing/public/favicon-32.png
#   tenant-landing/public/icon-192.png
#   tenant-landing/public/icon-512.png
#   tenant-landing/public/apple-touch-icon.png
#   tenant-landing/public/og-image.png
#   assets/store/icon-512.png   (Play Store)
#   assets/icon.png             (Expo: iOS app icon, 1024x1024)
#   assets/adaptive-icon.png    (Expo: Android adaptive foreground, 1024x1024)
#   assets/splash.png           (Expo: splash, 1284x2778)
#
# The clock-mark is drawn natively with ImageMagick `-draw` directives so we
# don't rely on a separate SVG renderer. Geometry mirrors the source SVG at
# `assets/branding/mark.svg` (viewBox 0 0 64 64, stroke-width 4).
#
# Requires: ImageMagick 7+ (`magick`). On macOS:  brew install imagemagick
#
# Usage:  bash scripts/branding/render-brand-assets.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

OUT_TENANT="$ROOT/tenant-landing/public"
OUT_STORE="$ROOT/assets/store"
OUT_EXPO="$ROOT/assets"
mkdir -p "$OUT_TENANT" "$OUT_STORE" "$OUT_EXPO"

if ! command -v magick >/dev/null 2>&1; then
  echo "ERROR: ImageMagick (\`magick\`) not found. brew install imagemagick" >&2
  exit 1
fi

BG="#0F766E"   # brand teal
FG="#FFFFFF"   # mark color (white on brand)

# Draw the clock mark on a square brand backdrop.
#   $1: size in px
#   $2: foreground inset as a percent of size (controls mark scale)
#   $3: output path
render_mark() {
  local size=$1 pad_pct=$2 out=$3

  # Compute the mark's bounding box inside the canvas. The source SVG is
  # 64x64; we scale geometry from that reference.
  local inset=$((size * pad_pct / 100))
  local box=$((size - 2 * inset))            # mark bounding box (px)
  local cx=$((size / 2))                     # canvas center
  local cy=$((size / 2))
  # Scale a unit at the SVG's 64px reference into final canvas px.
  local r=$((box * 26 / 64))                 # outer circle radius
  local stroke=$(awk -v b="$box" 'BEGIN{ s=b*4/64; if (s<2) s=2; printf "%.0f", s}')
  local tick_outer=$((box * 26 / 64))        # tick mark outer offset (== r)
  local tick_inner=$((box * 20 / 64))        # tick mark inner offset
  local hour_len=$((box * 12 / 64))          # 12 → 32-20 in source
  local min_dx=$((box * 12 / 64))            # 12 → 44-32
  local min_dy=$((box *  4 / 64))            # 4  → 36-32

  echo "  $out (${size}x${size}, ${pad_pct}% pad)"

  magick -size "${size}x${size}" canvas:"$BG" \
    -fill none -stroke "$FG" -strokewidth "$stroke" \
    -draw "stroke-linecap round stroke-linejoin round
           circle $cx,$cy $cx,$((cy - r))
           line $cx,$((cy - tick_outer)) $cx,$((cy - tick_inner))
           line $((cx + tick_outer)),$cy $((cx + tick_inner)),$cy
           line $cx,$((cy + tick_outer)) $cx,$((cy + tick_inner))
           line $((cx - tick_outer)),$cy $((cx - tick_inner)),$cy
           line $cx,$cy $cx,$((cy - hour_len))
           line $cx,$cy $((cx + min_dx)),$((cy + min_dy))" \
    "$out"
}

# Standard inset for app icons (16% pad, mark fills ~68% of canvas).
render_mark 32   16 "$OUT_TENANT/favicon-32.png"
render_mark 180  16 "$OUT_TENANT/apple-touch-icon.png"
render_mark 192  16 "$OUT_TENANT/icon-192.png"
render_mark 512  16 "$OUT_TENANT/icon-512.png"
render_mark 512  16 "$OUT_STORE/icon-512.png"
render_mark 1024 16 "$OUT_EXPO/icon.png"

# Android adaptive icon foreground: extra padding so the OS mask doesn't crop.
render_mark 1024 32 "$OUT_EXPO/adaptive-icon.png"

# Splash: 1284x2778 (iPhone 15 Pro Max bounds; smaller devices letterbox).
# Mark centered, ~440px reference.
echo "  $OUT_EXPO/splash.png (1284x2778)"
# Render the centered mark on a 440x440 canvas, then composite onto the
# splash backdrop. Reusing render_mark keeps the geometry consistent.
TMP_SPLASH="$(mktemp -t splash-mark.XXXXXX).png"
render_mark 440 0 "$TMP_SPLASH" >/dev/null
magick -size 1284x2778 canvas:"$BG" \
  "$TMP_SPLASH" -gravity center -composite \
  "$OUT_EXPO/splash.png"
rm -f "$TMP_SPLASH"

# Multi-resolution favicon.ico (16+32+48 from the same source).
echo "  favicon.ico"
magick \
  \( "$OUT_TENANT/favicon-32.png" -resize 16x16 \) \
  \( "$OUT_TENANT/favicon-32.png" -resize 32x32 \) \
  \( "$OUT_TENANT/favicon-32.png" -resize 48x48 \) \
  "$OUT_TENANT/favicon.ico"

# Open Graph image — 1200x630 brand backdrop with the mark centered to the
# left + wordmark text rendered with ImageMagick. Avoids the SVG renderer.
echo "  og-image.png (1200x630)"
TMP_OG_MARK="$(mktemp -t og-mark.XXXXXX).png"
render_mark 360 0 "$TMP_OG_MARK" >/dev/null
magick -size 1200x630 canvas:"$BG" \
  -fill "$FG" -font "Helvetica-Bold" -pointsize 120 \
  -gravity center -annotate +130+0 "ma3ady" \
  "$TMP_OG_MARK" -gravity west -geometry +120+0 -composite \
  "$OUT_TENANT/og-image.png"
rm -f "$TMP_OG_MARK"

echo
echo "Done."
