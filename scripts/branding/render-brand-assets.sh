#!/usr/bin/env bash
# Render PNG raster assets from the SVG sources in assets/branding/.
#
# Outputs land in:
#   tenant-landing/public/favicon.ico
#   tenant-landing/public/favicon-32.png
#   tenant-landing/public/icon-192.png
#   tenant-landing/public/icon-512.png
#   tenant-landing/public/apple-touch-icon.png
#   tenant-landing/public/og-image.png
#   assets/store/icon-512.png  (Play Store)
#
# Requires: ImageMagick 7+ (`magick`) and `librsvg`-rsvg-convert OR a recent
# ImageMagick that bundles an SVG delegate. On macOS:
#   brew install imagemagick librsvg
#
# Usage:  bash scripts/branding/render-brand-assets.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/assets/branding/mark.svg"
WORDMARK_EN="$ROOT/assets/branding/wordmark-en.svg"

OUT_TENANT="$ROOT/tenant-landing/public"
OUT_STORE="$ROOT/assets/store"
mkdir -p "$OUT_TENANT" "$OUT_STORE"

if ! command -v magick >/dev/null 2>&1; then
  echo "ERROR: ImageMagick (\`magick\`) not found. brew install imagemagick" >&2
  exit 1
fi

# Background color for square icons (favicon, apple-touch, store icon). Use the
# same brand teal as the design tokens.
BG="#0F766E"
FG="#FFFFFF"

# Render a single sized PNG from the mark SVG, recoloured white on the brand
# backdrop and centered with 16% padding.
render_square() {
  local size=$1 out=$2
  local pad=$((size * 16 / 100))
  local inner=$((size - 2 * pad))
  echo "  $out (${size}x${size})"
  magick \
    -background "$BG" -size "${size}x${size}" canvas:"$BG" \
    \( "$SRC" -background none -resize "${inner}x${inner}" -alpha set \
       -channel RGB -fuzz 0% -fill "$FG" -opaque "#000000" +channel \
    \) -gravity center -composite \
    "$out"
}

render_square 32  "$OUT_TENANT/favicon-32.png"
render_square 180 "$OUT_TENANT/apple-touch-icon.png"
render_square 192 "$OUT_TENANT/icon-192.png"
render_square 512 "$OUT_TENANT/icon-512.png"
render_square 512 "$OUT_STORE/icon-512.png"

# Multi-resolution favicon.ico (16+32+48 from the same source).
echo "  favicon.ico"
magick \
  \( "$OUT_TENANT/favicon-32.png" -resize 16x16 \) \
  \( "$OUT_TENANT/favicon-32.png" -resize 32x32 \) \
  \( "$OUT_TENANT/favicon-32.png" -resize 48x48 \) \
  "$OUT_TENANT/favicon.ico"

# Open Graph image — 1200x630, brand backdrop, centered wordmark. Falls back
# to the mark when the wordmark SVG has rendering issues.
OG_W=1200
OG_H=630
echo "  og-image.png (${OG_W}x${OG_H})"
SOURCE="$WORDMARK_EN"
[ -f "$SOURCE" ] || SOURCE="$SRC"
magick \
  -background "$BG" -size "${OG_W}x${OG_H}" canvas:"$BG" \
  \( "$SOURCE" -background none -resize 700x \
     -channel RGB -fuzz 0% -fill "$FG" -opaque "#000000" +channel \
  \) -gravity center -composite \
  "$OUT_TENANT/og-image.png"

echo
echo "Done. Tenant-landing assets in $OUT_TENANT, store icon in $OUT_STORE/"
