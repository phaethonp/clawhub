# The Urbicana fork of ClawHub

`phaethonp/clawhub` is `openclaw/clawhub` with Urbicana's identity and, later,
Urbicana's data wired underneath. It serves hub.urbicana.com.

**Rule: upstream's files are never edited.** Everything Urbicana adds lives in
`urbicana/`. Proof at any time:

```bash
git diff --stat main...urbicana -- . ':!urbicana'
```

must print nothing.

## Branches

- `main`: an exact copy of `upstream/main` (openclaw/clawhub). Only ever
  fast-forwarded from upstream; never committed to.
- `urbicana`: Urbicana's work. `main` is merged into it.

## How the brand is applied

| Piece | File | How |
| --- | --- | --- |
| Name, description, domain | `brand.ts` | the only place they are written |
| Renames in upstream's source | `rename.ts` | applied while the app is compiled; whole words only, so `getClawHubSiteUrl`, the `clawhub` CLI, packages and `CLAWHUB_*` stay |
| Page labels | `copy.ts` | per-file exact phrases (Skills → Services, Plugins → Products, Official → Verified, Creators → Agents); each must still match after a sync |
| Rename counts | `rename-manifest.json` | how many renames each upstream file gets; a change fails the check |
| Images, icons, manifest | `public/` | served at upstream's own paths, so no reference changes |
| Files not served | `assets.ts` `NOT_SERVED` | upstream's registry discovery and security contact; 404 in dev, deleted from the build |
| Build hook | `plugin.ts`, `vite.config.ts` | upstream's config plus the plugin; start with `--config urbicana/vite.config.ts` |
| Check | `check.ts` | runs on every build and dev start |

## Run it

```bash
cd ~/clawhub
export PATH=/opt/homebrew/opt/node@22/bin:$PATH   # ClawHub's .nvmrc: 22
VITE_CONVEX_URL=https://example.invalid \
VITE_CONVEX_SITE_URL=https://example.invalid \
./node_modules/.bin/vite dev --config urbicana/vite.config.ts --port 3010
```

Pages read Urbicana's Rails through `urbicana/data/` (see MAPPING.md); the
dev server forwards `/urbicana-api/*` to `URBICANA_RAILS_URL` (default
`http://localhost:5000`, app_v2's local Puma). The Convex addresses point at
nothing on purpose: a few upstream pages `fetch` ClawHub's HTTP API directly,
and those must fail rather than show ClawHub's data. Upstream's own
`bun run dev` runs the server under Bun, whose first server-side fetch fails
here; the command above uses Node. Under Node the dev server's static-file
path (srvx's Node adapter) crashes the process on any `public/` file, so
plugin.ts serves `public/` itself in development.

Type-check Urbicana's files: `bunx tsc -p urbicana/tsconfig.json`.

## Build and run for production

```bash
cd ~/clawhub
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
VITE_CONVEX_URL=https://example.invalid \
VITE_CONVEX_SITE_URL=https://example.invalid \
VITE_SITE_URL=https://hub.urbicana.com \
./node_modules/.bin/vite build --config urbicana/vite.config.ts
URBICANA_RAILS_URL=<Rails origin> PORT=3000 node .output/server/index.mjs
```

The plugin's Nitro module adds the server routes production needs
(`urbicana/server/`): `/urbicana-api/*` forwarded to `URBICANA_RAILS_URL`,
ClawHub's direct `/api/v1/*` calls answered from `data/http.ts`, and 404 for
the files in `NOT_SERVED` (also left out of Nitro's static list). The build
step copies Urbicana's images over upstream's in `.output/public` and the
share-image art into `.output/server`. Checked 2026-10-08 with a local
production build against Rails on :5000: pages, sign-in, services, agents,
professionals, 404 for not-served files, no errors.

## Syncing from upstream

1. `git fetch upstream`
2. `git checkout main && git merge --ff-only upstream/main && git push origin main`
3. `git checkout urbicana && git merge main`. Upstream's files were never
   edited here, so this has no conflicts.
4. `bun install`
5. `bun urbicana/check.ts`. If it fails it names each file:
   - **renames recorded X, found Y**: upstream changed text containing
     "ClawHub" or "clawhub.ai" in that file. Read the change. If the rename
     is right, run `bun urbicana/check.ts --update`; if a new occurrence
     must not be renamed, narrow the rule in `rename.ts`.
   - **upstream file with no Urbicana replacement**: upstream added a public
     file. If it is ClawHub's art, add a replacement to `public/` (through
     `make-assets.sh`); if it is not brand, add it to `NOT_BRAND` in
     `assets.ts`; if it announces ClawHub's services, add it to `NOT_SERVED`.
   - **replaces nothing**: upstream renamed or removed that file. Find where
     its reference moved and rename the replacement to match.
6. Start the site and look at `/`, `/skills`, `/official`, a skill page, a
   publisher page and a missing page, in light and dark: nothing says
   ClawHub, no lobster art.
7. Record the merge in this file's log below.

## Log

- 2026-10-08: fork created from upstream `c23e34ad`; brand layer added.
