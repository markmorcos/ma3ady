#!/usr/bin/env bash
# Render the Play Store feature graphic (1024x500) per locale.
#
# Outputs:  assets/store/feature-graphic-1024x500-{en,ar}.png
#
# Inputs:   assets/branding/wordmark-{en,ar}.svg + assets/branding/mark.svg
#
# Requires: ImageMagick 7+ (`magick`).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BRAND="$ROOT/assets/branding"
OUT_DIR="$ROOT/assets/store"
mkdir -p "$OUT_DIR"

W=1024
H=500
BG="#0F766E"
FG="#FFFFFF"

if ! command -v magick >/dev/null 2>&1; then
  echo "ERROR: ImageMagick not found. brew install imagemagick" >&2
  exit 1
fi

render() {
  local locale=$1
  local wordmark="$BRAND/wordmark-${locale}.svg"
  local out="$OUT_DIR/feature-graphic-${W}x${H}-${locale}.png"
  echo "  $out"
  if [ ! -f "$wordmark" ]; then
    echo "    (missing $wordmark — falling back to mark)"
    wordmark="$BRAND/mark.svg"
  fi
  magick \
    -background "$BG" -size "${W}x${H}" canvas:"$BG" \
    \( "$wordmark" -background none -resize 600x \
       -channel RGB -fuzz 0% -fill "$FG" -opaque "#000000" +channel \
    \) -gravity center -composite \
    "$out"
}

for locale in en ar; do
  render "$locale"
done

echo
echo "Done. Feature graphics in $OUT_DIR/"
