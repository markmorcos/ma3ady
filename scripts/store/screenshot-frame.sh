#!/usr/bin/env bash
# scripts/store/screenshot-frame.sh
#
# Composite raw store screenshots onto a brand-coloured backdrop, producing
# framed assets ready for App Store Connect / Google Play upload.
#
# Inputs:
#   assets/store/screenshots/{ios,android}/{en,ar}/*.png
#
# Outputs:
#   assets/store/screenshots-framed/{ios,android,android-tablet-7,android-tablet-10}/{en,ar}/*.png
#
# Phone framing keeps the source aspect ratio with brand padding around it.
# Tablet framing letterboxes the same phone shots onto wider canvases sized
# for Play Store's 7" (~1024×600 minimum) and 10" (~1280×800 minimum)
# screenshot slots — quick path to Play submissions before bespoke tablet
# captures exist.
#
# Requires: ImageMagick 7+ (`magick`). On macOS:  brew install imagemagick
#
# Brand backdrop: #0F766E (matches `tenants.brand_color` for the demo tenant
# and the design-system brand-700 token).
#
# Usage:
#   bash scripts/store/screenshot-frame.sh                # frame everything
#   bash scripts/store/screenshot-frame.sh android        # one platform
#   bash scripts/store/screenshot-frame.sh android en     # one platform/locale
#
# Optional flags (env vars):
#   ROUNDED=1  add rounded corners on the screenshot
#   SHADOW=1   add a soft drop shadow under the screenshot
#   SKIP_TABLETS=1   skip the tablet-7/tablet-10 outputs

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC_ROOT="$ROOT/assets/store/screenshots"
OUT_ROOT="$ROOT/assets/store/screenshots-framed"

BRAND_BG="#0F766E"
PADDING=80
RADIUS=48
SHADOW_PARAMS="50x14+0+12"

# Tablet output dimensions in px. Play Store accepts a wide range; these sit
# comfortably above the minimums and below the 7680px ceiling.
TABLET_7_W=1024
TABLET_7_H=600
TABLET_10_W=1280
TABLET_10_H=800

ROUNDED="${ROUNDED:-0}"
SHADOW="${SHADOW:-0}"
SKIP_TABLETS="${SKIP_TABLETS:-0}"

if ! command -v magick >/dev/null 2>&1; then
  echo "ERROR: ImageMagick (\`magick\`) not found. Install via: brew install imagemagick" >&2
  exit 1
fi

round_corners() {
  local in="$1"
  local tmp
  tmp="$(mktemp -t scrshot.XXXXXX).png"
  local W H
  read -r W H < <(magick identify -format "%w %h\n" "$in")
  magick "$in" \
    \( -size "${W}x${H}" canvas:black -fill white \
       -draw "roundrectangle 0,0 $((W - 1)),$((H - 1)) $RADIUS,$RADIUS" \
    \) \
    -alpha off -compose CopyOpacity -composite \
    PNG32:"$tmp"
  echo "$tmp"
}

add_shadow() {
  local in="$1"
  local tmp
  tmp="$(mktemp -t scrshot.XXXXXX).png"
  magick "$in" \
    \( +clone -background black -shadow "$SHADOW_PARAMS" \) \
    +swap -background none -layers merge +repage \
    PNG32:"$tmp"
  echo "$tmp"
}

# Frame the screenshot at its native aspect ratio with PADDING brand pixels
# on every side. Used for ios and android phone outputs.
frame_phone() {
  local in="$1" out="$2"
  mkdir -p "$(dirname "$out")"

  local working="$in"
  local cleanup=()
  if [ "$ROUNDED" = "1" ]; then
    working="$(round_corners "$working")"
    cleanup+=("$working")
  fi
  if [ "$SHADOW" = "1" ]; then
    local next
    next="$(add_shadow "$working")"
    cleanup+=("$next")
    working="$next"
  fi

  local W H
  read -r W H < <(magick identify -format "%w %h\n" "$working")
  local outW=$((W + 2 * PADDING))
  local outH=$((H + 2 * PADDING))

  magick "$working" \
    -background "$BRAND_BG" \
    -gravity center \
    -extent "${outW}x${outH}" \
    -alpha remove -alpha off \
    "$out"

  for f in "${cleanup[@]}"; do rm -f "$f"; done
}

# Letterbox the (already-framed) phone shot onto a fixed-size brand canvas
# to satisfy a Play Store tablet slot. We resize-down to fit the height with
# a margin and centre on the wider canvas.
frame_tablet() {
  local in="$1" out="$2" outW="$3" outH="$4"
  mkdir -p "$(dirname "$out")"

  local target_h=$((outH * 90 / 100))  # 90% of canvas height
  magick "$in" \
    -resize "x${target_h}" \
    -background "$BRAND_BG" \
    -gravity center \
    -extent "${outW}x${outH}" \
    -alpha remove -alpha off \
    "$out"
}

run_locale() {
  local platform="$1" locale="$2"
  local src_dir="$SRC_ROOT/$platform/$locale"
  local phone_out="$OUT_ROOT/$platform/$locale"
  shopt -s nullglob
  local files=("$src_dir"/*.png)
  shopt -u nullglob
  if [ ${#files[@]} -eq 0 ]; then
    echo "  (no screenshots in $src_dir — skipping)"
    return
  fi
  for f in "${files[@]}"; do
    local base; base="$(basename "$f")"
    echo "  $platform/$locale/$base"
    local phone_path="$phone_out/$base"
    frame_phone "$f" "$phone_path"

    if [ "$platform" = "android" ] && [ "$SKIP_TABLETS" != "1" ]; then
      frame_tablet "$phone_path" \
        "$OUT_ROOT/android-tablet-7/$locale/$base" "$TABLET_7_W" "$TABLET_7_H"
      frame_tablet "$phone_path" \
        "$OUT_ROOT/android-tablet-10/$locale/$base" "$TABLET_10_W" "$TABLET_10_H"
    fi
  done
}

PLATFORMS=("ios" "android")
LOCALES=("en" "ar")

if [ $# -ge 1 ]; then PLATFORMS=("$1"); fi
if [ $# -ge 2 ]; then LOCALES=("$2"); fi

for p in "${PLATFORMS[@]}"; do
  for l in "${LOCALES[@]}"; do
    echo "Framing $p/$l"
    run_locale "$p" "$l"
  done
done

echo
echo "Done. Framed assets are under $OUT_ROOT/"
[ "$ROUNDED" = "1" ]      || echo "(re-run with ROUNDED=1 for rounded corners)"
[ "$SHADOW" = "1" ]       || echo "(re-run with SHADOW=1 for a soft drop shadow)"
[ "$SKIP_TABLETS" = "1" ] || echo "(re-run with SKIP_TABLETS=1 to skip android-tablet-7/-10)"
