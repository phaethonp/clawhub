#!/usr/bin/env bash
# Renders urbicana/assets-src/ into urbicana/public/, one file per upstream
# public file it replaces (same path). Needs rsvg-convert and ImageMagick 7.
set -euo pipefail
cd "$(dirname "$0")"
src=assets-src
out=public
mkdir -p "$out"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

png() { rsvg-convert -w "$2" -h "$3" "$src/$1" -o "$4"; }

# The mark: header, footer, dashboard, app icons, favicon.
png mark.svg 128 128 "$out/logo-transparent.png"
png mark.svg 192 192 "$out/logo192.png"
png mark.svg 512 512 "$out/logo512.png"
png mark.svg 1024 1024 "$out/clawd-mark.png"
png mark.svg 1024 1024 "$out/clawd-logo.png"
png mark.svg 512 512 "$out/og-logo.png"
for s in 16 24 32 48 64; do png mark.svg $s $s "$tmp/fav-$s.png"; done
magick "$tmp"/fav-16.png "$tmp"/fav-24.png "$tmp"/fav-32.png "$tmp"/fav-48.png "$tmp"/fav-64.png "$out/favicon.ico"

# The share card.
png og.svg 1200 630 "$out/og.png"
cp "$src/og.svg" "$out/og.svg"

# Upstream's mascot art, replaced by nothing: transparent images keep the
# layout and show no lobster.
magick -size 825x854 xc:none -define png:exclude-chunks=date,time "$out/og-clawhub-watermark.png"
magick -size 1672x941 xc:none "$out/home-hero-claw.webp"
magick -size 1672x941 xc:none "$out/home-hero-claw-light.webp"
magick -size 1672x941 xc:none "$out/footer-openclaw-easter-egg.webp"
magick -size 1672x941 xc:none "$out/footer-openclaw-easter-egg-transparent.webp"
magick -size 1672x941 xc:none -define png:exclude-chunks=date,time "$out/footer-openclaw-easter-egg.png"
magick -size 1672x941 xc:none -define png:exclude-chunks=date,time "$out/footer-openclaw-easter-egg-transparent.png"
magick -size 1613x575 xc:none -define png:exclude-chunks=date,time "$out/github-import-hero-art.png"

# The not-found picture: the mark on the page colour.
rsvg-convert -w 256 -h 256 "$src/mark.svg" -o "$tmp/mark256.png"
magick -size 1535x1024 xc:'#f6f5f3' "$tmp/mark256.png" -gravity center -composite -quality 90 "$out/404-lobster-detective.jpg"

echo "rendered $(ls "$out" | wc -l | tr -d ' ') files into urbicana/$out"
