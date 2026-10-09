# Pages and mapping: ClawHub's pages on Urbicana's data

Measured 2026-10-08 on upstream `c23e34ad` with `bun urbicana/inventory.ts`
(each route's reachable `api.<module>.<function>` calls). Rails endpoints
read the same day in `~/app_v2` (`config/routes/api.rb`). Brought up to date
at the end of 2026-10-08 with what is built.

## The concepts

A2A: every person and business has its own agent; agents find and sell
services to each other. Urbicana offers services only (phae, 2026-10-09).
Its plugins are city plugins: "Plug into your city" (`city-plugins.ts`).

| ClawHub | Urbicana | Source of record |
| --- | --- | --- |
| skill | a **service** an agent offers (one skill on its A2A card) | `agent_skills` (app_v2, committed `27be853d4`): one row per non-supplied card skill, origin `listing` or `typed`, price, delivery, location, agent address |
| plugin | a **city plugin**: the people and businesses of a city, by discipline ("Every discipline that builds the city.") | `urbicana/city-plugins.ts`; its disciplines open the people list until the registers→disciplines mapping tool exists |
| publisher (user or org) | a **member**: a person or business with its agent | user + profile slug + `a2a_agent_cards` + `member_agents` |
| official publisher | an **agent**: every member whose card is publishable (phae, 2026-10-08). How a claimed or verified agent is marked is phae's open decision; the earlier "verified agents" rule came from a wiki line and was removed | `a2a_agent_cards` (publishable), `claimed` reported as a fact |
| (none) | a **professional on the record** who has not claimed a profile | Server B `all_entities` via the registry reads, per register (`entity_spine_declarations`) |
| star | a saved agent or service | none yet |
| downloads / installs | (no equivalent; hire and contact counts later) | none |
| GitHub sign-in | Urbicana sign-in | `POST /api/v1/auth/sign_in`, `GET /api/v1/auth/me` (JWT) |

## Every page, decided

**Rule from CLAUDE.md that changes the front:** every read of platform data
requires a signed-in user. ClawHub's front is public; ours shows sign-in to
a visitor until phae approves an anonymous exception in writing.

### Wired: the front

| Page | Urbicana shows | Answered by |
| --- | --- | --- |
| `/` | hero; services (tabs All, Trending, Verified, New); agents strip | `featuredSkills:listPublic` (All) and `skills:listPublicPageV4` (New, Verified) → `GET /registry/services`; `publishers:listPublicPage` → `GET /registry/agents`; Trending reports unavailable (switch off); the Plugins switch lists the city plugins; the "Plug into your city" banner |
| `/skills` | Services: count, list, search | `skills:listPublicPageV4`, `skills:countPublicSkills` → `GET /registry/services`; `search:searchSkills` → `GET /registry/skills?ask=`; categories are ClawHub's static list (no category on services yet) |
| `/official` | Agents: every agent with a publishable card | `publishers:listPublicPage` → `GET /registry/agents` |
| `/publishers` | **On Record** (menu: Services · Agents · On Record): the people and businesses on the record, per register for now; location first and professions as filters next (urbicana/pages/OnRecord.tsx, ClawHub's catalogue screen) | `GET /server_b/registry/directories`, `GET /server_b/registry?source=` |
| `/search` | services and agents for a sentence | `search:searchSkills`, `publishers:listPublicPage(query)` → `GET /registry/skills?ask=` |
| `/$owner/$slug` | one service, `urbicana/pages/Service.tsx` (ClawHub's SkillDetailPageView: terms in the sidebar, no install) | `skills:getBySlug` → `GET /registry/services/:handle/:skill_id`; `skills:listVersions`, `skills:listRelatedByCategory`, `skillEvaluations:getCurrentForSkill` answered empty (none exist); no version, so no readme or files; bookmark not answered |
| `/$slug`, `/user/$handle` | the agent's page | **not wired**: needs a signed-in member-by-handle read (card, services, persona when claimed) |

### Wired: under the account menu (the Workshop)

| Page | Urbicana | Answered by |
| --- | --- | --- |
| `/dashboard` | my agent's services; the welcome screen without any | `publishers:listMine`, `skills:listDashboardPaginated` → `GET /registry/me`; `packages:list` → empty; download metrics not wired |
| `/skills/publish`, `/plugins/publish`, `/add` | still ClawHub's SKILL.md and plugin publishing | **open**: Urbicana's listing flow is the main app's `/@<user slug>/user/sell-services` (phae to decide how the hub links it) |
| `/settings` | ClawHub's settings page | not wired |
| `/stars` | ClawHub's bookmarks | not wired (no table) |

### Every page: the shell

`__root.tsx` on every page: `users.me`, `users.ensure` → `GET /api/v1/auth/me`;
`publishers.getMyProfileHandle` → the profile slug from `GET /registry/me`;
`search.searchSkills` + `publishers.listPublicPage` (header search) → as
`/search`; `appMeta.getDeploymentInfo` → constant.

### Switched off (hidden from navigation, route answers not-found)

Built 2026-10-08: `urbicana/switched-off.ts` lists the paths; one check at the
start of the root route's `beforeLoad` (copy.ts rule on `__root.tsx`) throws
not found for them, on the server and on client-side navigation. `/add`,
`/skills/publish` and `/plugins/publish` stay until the "Add a service" flow
replaces them.

| Paths (urbicana/switched-off.ts) | Why |
| --- | --- |
| `/audits`, every `…/security-audit` and `…/security/$scanner` | ClawHub's scanners; nothing scans services |
| `/skills-sh/...` | mirror of the external skills.sh catalogue |
| `/import` | GitHub import of SKILL.md files |
| `/cli/auth`, `/cli/device`, `/auth/docs` | ClawHub CLI and OpenClaw docs sign-in |
| `/management` | ClawHub staff moderation |
| `/$owner/$slug/settings`, `/$owner/skills/$slug/settings` | per-skill settings |
| `…/.well-known/agent-skills/…` | install discovery for skills an agent installs; ours are sold |
| `/plugins/new` | plugin publishing |

`/plugins` is "Plug into your city", the city plugins, with the live cities
as its categories; `/plugins/<name>` is a city plugin's page. `/publishers`
is the people list a discipline opens (no menu link); the other
redirect-only routes (`/u`, `/users`, `/orgs`, `/p`, `/packages`, `/upload`,
`/publish-skill`, `/admin`) keep redirecting.

## Rails reads the hub uses (app_v2)

All signed-in (JWT). Built 2026-10-08 on `feat/registry-directory-geography`
(commits `3bcdac4d`, `11d794f6`, `f92bf765`) except the first two lines.

| Read | Answers |
| --- | --- |
| `GET /auth/me`, `POST /auth/sign_in` | the member, sign-in |
| `GET /registry/skills?ask=` | services search (another session's work) |
| `GET /registry/services` (+ `sort`, `verified`, `tag`, `created_after`, cursor) | services listed without a question |
| `GET /registry/services/:handle/:skill_id` | one service (page not wired yet) |
| `GET /registry/agents` (+ `q`, cursor) | every agent with a publishable card, with its services and `claimed` |
| `GET /registry/me` | the member's own agent: handle, card state, services |
| `GET /server_b/registry/directories`, `GET /server_b/registry?source=` | the professionals directory |

Still missing: a signed-in member-by-handle read for the agent's page
(`discover/agents/:handle` has the shape but takes a service token).

## How the fork answers ClawHub's calls (built 2026-10-08)

ClawHub's pages call `useQuery(api.module.fn, args)`,
`convexHttp.query(api.module.fn, args)` and friends. `urbicana/plugin.ts`
points the imports `convex/react`, `convex/browser` and
`@convex-dev/auth/react` at `urbicana/data/` at build time:

| File | Stands in for |
| --- | --- |
| `data/react.tsx` | useQuery, useQueries, useMutation, useAction, usePaginatedQuery, useConvex, useConvexAuth, ConvexReactClient |
| `data/browser.ts` | ConvexHttpClient (route loaders) |
| `data/auth.tsx` | ConvexAuthProvider, useAuthActions, useAuthToken: `signIn("github")` opens an Urbicana email + password dialog |
| `data/functions.ts` | **the table**: function name → Rails request → ClawHub's shape |
| `data/client.ts` | runs a name, caches results, refetches after a change or a sign-in/out |
| `data/rails.ts`, `data/session.ts` | the Rails request and the member's token |

A name with no row in the table is not answered: its hook stays loading and
the console says `[urbicana] not wired yet: <name>`. Wired so far:

| Function | Answer |
| --- | --- |
| `users:me`, `users:ensure` | `GET /auth/me` |
| `publishers:getMyProfileHandle`, `publishers:listMine` | `GET /registry/me` |
| `skills:listDashboardPaginated` | `GET /registry/me` (its services) |
| `search:searchSkills` | `GET /registry/skills?ask=` → one native skill result per service (`data/search.ts`) |
| `publishers:listPublicPage` | with `query`: that search's agents; without: `GET /registry/agents` |
| `skills:listPublicPageV4`, `skills:countPublicSkills`, `featuredSkills:listPublic` | `GET /registry/services` |
| `packages:list` | empty (city plugins are not packages) |
| `rolloutCapabilities:getPublicCapabilities`, `appMeta:getDeploymentInfo` | constants |

ClawHub's pages also `fetch` some public API paths directly. `data/http.ts`
answers them, before ClawHub's own `/api/**` handler (development: the
plugin's middleware; production: `urbicana/server/api-routes.ts`, registered
by the plugin's Nitro module):
`/api/v1/search` (the services search), `/api/v1/plugins` and
`/api/v1/plugins/search` (the city plugins, `?category=` a city), `/api/v1/promotions` (none).
The member is identified by the `urbicana_token` cookie, which session.ts
keeps beside the browser's session; route loaders on the fork's server read
the same cookie (`currentToken()`), so pages rendered there show the
member's data.

Known gaps:
- The agent handle is the profile slug (`pot8os-<uuid>` for phae); a
  service's category shows "Other" (no category on agent_skills); bookmark
  and download counts are 0.
- The member's portrait is not shown (an Active Storage path on Rails'
  origin); the header falls back to Gravatar.
- Professionals rows show "@entity-…" and ClawHub's "0 published · 0
  downloads", and link to a profile page that does not exist for them; "All
  categories" is the default register; name search covers the default
  register only (as Rails does).
- Share images (server/og/) still state ClawHub's facts: downloads, "Audit
  PASS", an install line (ASSETS.md).
