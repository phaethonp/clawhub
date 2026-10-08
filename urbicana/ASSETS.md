# Urbicana assets: sources and rights

Recorded as `openclaw-brand/references/asset-rights.md` requires: source and
owner, licence, allowed use, attribution, where the evidence lives.

## Made for this fork (2026-10-08)

| File(s) in `public/` | Source | Owner / licence |
| --- | --- | --- |
| `logo-transparent.png`, `logo192.png`, `logo512.png`, `favicon.ico`, `clawd-mark.png`, `clawd-logo.png`, `og-logo.png` | `assets-src/mark.svg`: a U drawn as one path on a rounded tile, no font, no third-party artwork | Urbicana; made here, no third-party rights |
| `og.png`, `og.svg` | `assets-src/og.svg`: the mark plus text set in the system sans-serif (Helvetica Neue / Helvetica / Arial); the PNG is rendered, no font file is shipped | Urbicana; system fonts used as allowed by the asset-rights rule |
| `404-lobster-detective.jpg` | the mark on the page colour | Urbicana |
| `home-hero-claw*.webp`, `footer-openclaw-easter-egg*`, `github-import-hero-art.png`, `og-clawhub-watermark.png` | transparent images at upstream's sizes; they remove ClawHub's mascot art without changing the layout | none (empty images) |
| `manifest.json` | written here | Urbicana |

Rebuild everything with `urbicana/make-assets.sh` (rsvg-convert, ImageMagick 7).

**The mark is interim.** It is a generic letterform and cannot serve as a
trademark. A real logo replaces `assets-src/mark.svg` and is recorded here
with its designer and rights.

## Upstream images still in use, deliberately

`NOT_BRAND` in `assets.ts`: third-party marks shown beside their names
(OpenAI, Slack, TanStack, the app icons) and crawler and API files.

## Still showing ClawHub or OpenClaw (not images; text and server art)

Done since this list was first written (copy.ts, data/auth.tsx): the home
hero, the footer (description, links, copyright, ecosystem strip), the
header's Docs link, "Sign in with GitHub", the home page's apps grid and
"Bring your skills" CLI section.

- `llms.txt`: ClawHub's summary for AI crawlers, generated from its docs;
  not served (NOT_SERVED in assets.ts) until Urbicana writes its own, which
  agents will use to find the hub.
- Share images the server draws (`server/og/`): artwork and name are
  Urbicana's since 2026-10-08 (development reads `urbicana/public/` first;
  the build copies Urbicana's art into the built server). Their content is
  still ClawHub's: the service card says "Downloads", "Audit PASS" and an
  `openclaw skills install` line, and the profile card's corner cuts off
  "Urbicana Registry". A share card designed for services and agents
  replaces them.
