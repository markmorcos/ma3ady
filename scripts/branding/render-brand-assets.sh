#!/usr/bin/env bash
# Render PNG raster assets for the ma3ady mark + wordmark.
#
# Outputs:
#   marketing/public/favicon.ico
#   marketing/public/favicon-32.png
#   marketing/public/icon-192.png
#   marketing/public/icon-512.png
#   marketing/public/apple-touch-icon.png
#   marketing/public/og-image.png
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

OUT_TENANT="$ROOT/marketing/public"
OUT_STORE="$ROOT/assets/store"
OUT_EXPO="$ROOT/assets"
mkdir -p "$OUT_TENANT" "$OUT_STORE" "$OUT_EXPO"

if ! command -v magick >/dev/null 2>&1; then
  echo "ERROR: ImageMagick (\`magick\`) not found. brew install imagemagick" >&2
  exit 1
fi

BG="#0F766E"   # brand teal
FG="#FFFFFF"   # mark color (white on brand)

# Draw the clock mark on a canvas. Pass `transparent` as the backdrop arg
# to render the mark on alpha (used for assets that pair with an
# Expo-controlled backgroundColor: adaptive-icon foreground + splash).
#   $1: size in px
#   $2: foreground inset as a percent of size (controls mark scale)
#   $3: output path
#   $4: backdrop — hex color (e.g. "#0F766E") or "transparent"
render_mark() {
  local size=$1 pad_pct=$2 out=$3 backdrop=${4:-$BG}

  local inset=$((size * pad_pct / 100))
  local box=$((size - 2 * inset))
  local cx=$((size / 2))
  local cy=$((size / 2))
  # Scale a unit at the SVG's 64px reference into final canvas px.
  local r=$((box * 26 / 64))
  local stroke=$(awk -v b="$box" 'BEGIN{ s=b*4/64; if (s<2) s=2; printf "%.0f", s}')
  local tick_outer=$((box * 26 / 64))
  local tick_inner=$((box * 20 / 64))
  local hour_len=$((box * 12 / 64))
  local min_dx=$((box * 12 / 64))
  local min_dy=$((box *  4 / 64))

  local canvas_arg
  if [ "$backdrop" = "transparent" ]; then
    canvas_arg="canvas:none"
  else
    canvas_arg="canvas:$backdrop"
  fi

  echo "  $out (${size}x${size}, ${pad_pct}% pad, backdrop=$backdrop)"

  magick -size "${size}x${size}" "$canvas_arg" \
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

# Web icons: solid brand backdrop (favicons display directly).
render_mark 32   16 "$OUT_TENANT/favicon-32.png"
render_mark 180  16 "$OUT_TENANT/apple-touch-icon.png"
render_mark 192  16 "$OUT_TENANT/icon-192.png"
render_mark 512  16 "$OUT_TENANT/icon-512.png"
render_mark 512  16 "$OUT_STORE/icon-512.png"

# iOS app icon — solid backdrop (App Store + iOS render the bitmap directly,
# no system-side mask).
render_mark 1024 16 "$OUT_EXPO/icon.png"

# Android adaptive-icon foreground: TRANSPARENT, mark only. The OS composes
# this over `android.adaptiveIcon.backgroundColor` from app.json (we pin
# that to the brand teal). Extra padding so the OS shape mask doesn't crop.
render_mark 1024 32 "$OUT_EXPO/adaptive-icon.png" transparent

# Splash: TRANSPARENT 1024x1024 mark only. We pair it with the
# expo-splash-screen plugin in app.json, which fills the device viewport
# with `backgroundColor` and centres the image at `imageWidth`. Avoids the
# fixed-aspect bake-in problem (where a 1284x2778 PNG with the bg colour
# baked in shows letterbox stripes on different device aspects).
render_mark 1024 0 "$OUT_EXPO/splash.png" transparent

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
render_mark 360 0 "$TMP_OG_MARK" transparent >/dev/null
magick -size 1200x630 canvas:"$BG" \
  -fill "$FG" -font "Helvetica-Bold" -pointsize 120 \
  -gravity center -annotate +130+0 "ma3ady" \
  "$TMP_OG_MARK" -gravity west -geometry +120+0 -composite \
  "$OUT_TENANT/og-image.png"
rm -f "$TMP_OG_MARK"

echo
echo "Done."
