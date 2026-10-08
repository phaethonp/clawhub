# Pages and mapping: ClawHub's pages on Urbicana's data

Measured 2026-10-08 on upstream `c23e34ad` with `bun urbicana/inventory.ts`
(each route's reachable `api.<module>.<function>` calls). Rails endpoints
read the same day in `~/app_v2` (`config/routes/api.rb`).

## The concepts

A2A: every person and business has its own agent; agents find and sell
services and products to each other.

| ClawHub | Urbicana | Source of record |
| --- | --- | --- |
| skill | a **service** an agent offers (one skill on its A2A card) | `agent_skills` (app_v2, committed `27be853d4`): one row per non-supplied card skill, origin `listing` or `typed`, price, delivery, location, agent address |
| plugin | a **product** an agent sells | **none yet**: app_v2 has no products table (`stripe_products` is billing) |
| publisher (user or org) | a **member**: a person or business with its agent | user + profile slug + `a2a_agent_cards` + `member_agents` |
| official publisher | a **verified agent**: the member's claim on their public-record entity is confirmed and the card is publishable | `entity_claims` (claimed) + `a2a_agent_cards` (publishable) + `member_agents` |
| star | a saved agent or service | none yet |
| downloads / installs | (no equivalent; hire and contact counts later) | none |
| GitHub sign-in | Urbicana sign-in | `POST /api/v1/auth/sign_in`, `GET /api/v1/auth/me` (JWT) |

## Every page, decided

**Rule from CLAUDE.md that changes the front:** every read of platform data
requires a signed-in user. ClawHub's front is public; ours shows sign-in to
a visitor until phae approves an anonymous exception in writing.

### Wired: the front

| Page | ClawHub shows | Urbicana shows | ClawHub calls → Urbicana answer |
| --- | --- | --- | --- |
| `/` | hero, featured/trending skills and plugins, popular publishers, apps, "bring your skills" | hero, services from verified agents, verified agents | `skills.listPublicPageV`, `search.searchNativeSkills`, `featuredSkills.listPublic` → **missing: list services without an ask**; `publishers.listPublicPage` → **missing: verified agents**; `packages.listPublicNewPluginsPage` → switched off (products); `rolloutCapabilities.getPublicCapabilities` → constant |
| `/skills` | the catalogue: search, categories, count, pages | services: search, tags, count, pages | `search.searchSkills` → `GET /api/v1/registry/skills?ask=` (being written, uncommitted); `skills.listPublicPageV`, `skills.countPublicSkills` → **missing: list + count without an ask**; `catalogTopics.listTopByCategory` → **missing: top tags** |
| `/official` | official organisations, counts | verified agents | `publishers.listPublicPage(official)` → **missing: verified agents** |
| `/search` | skills and publishers for a query | services and agents for a sentence | `search.searchSkills` → `registry/skills?ask=` (returns agents with their matching skills); `publishers.listPublicPage(q)` → **missing: agents by name** |
| `/$owner/$slug` (also `/$owner/skills/$slug`) | one skill: readme, files, versions, stats, owner tools | one service: description, price, delivery, location, the agent, a hire/contact action | `skills.getBySlug`, `getReadme`, `getSkillCard` → **missing: one agent_skill by handle + skill id**; `publishers.getByHandle`, `getProfileByHandle` → **missing: member by handle (signed-in)**, `GET discover/agents/:handle` exists but is service-token only; `listRelatedByCategory` → same-tag services; versions, files, GitHub content, evaluations, activity trend, hover stats → switched off; owner tools (rename, merge, delete, restore, summary, catalogue metadata) → the Workshop, below |
| `/$slug`, `/user/$handle` | publisher profile: published skills, members, stars | the agent's page: the card, its services, the person or business on the record | `publishers.getProfileByHandle` → **missing: member by handle**; `listPublishedPage` → that member's `agent_skills`; `getPublishedDisplayManifest` → switched off; `listMembers` → off (orgs later); `listStarredPage` → off; the public record → `GET /api/v1/server_b/personas/:id` when the claim is confirmed |

### Wired: under the account menu (the Workshop)

| Page | Urbicana | Answer |
| --- | --- | --- |
| `/dashboard` | my card's state (what blocks publishing), my services, my Workshop skills | `GET /api/v1/a2a/card` (+ gaps from `A2aAgentCard`), `GET /api/v1/service_listings`, `GET /api/v1/registry_skills`; downloads, warnings, security review → off |
| `/skills/publish` | add a service: the listing it is projected from | `POST /api/v1/service_listings` (the card re-projects it into a skill); slug check, changelog, upload → the listing's own fields |
| `/settings` | account and agent | `GET/PUT /api/v1/auth/me`/`update_profile`, `GET/PUT /api/v1/agent`; GitHub sources, orgs, invites, API tokens, account delete → off for now |
| `/stars` | saved agents and services | **missing** (no table); off until there is one |
| owner tools on a service page | edit or remove the listing behind it | `PUT/DELETE /api/v1/service_listings/:id` |

### Every page: the shell

`__root.tsx` on every page: `users.me`, `users.ensure` → `GET /api/v1/auth/me`;
`publishers.getMyProfileHandle` → the profile slug from `me`;
`search.searchSkills` + `publishers.listPublicPage` (header search) → as
`/search`; `appMeta.getDeploymentInfo` → constant.

### Switched off (hidden from navigation, route answers not-found)

| Pages | Why |
| --- | --- |
| `/plugins`, `/plugins/$name`, `/$owner/plugins/$slug`, `/plugins/publish`, `/plugins/new`, `/publish-plugin` | products: no source yet |
| `/audits`, every `security-audit` and `security/$scanner` page | ClawHub's scanners; nothing scans services |
| `/skills-sh/...` | mirror of the external skills.sh catalogue |
| `/import` | GitHub import of SKILL.md files |
| `/cli/auth`, `/cli/device`, `/auth/docs` | ClawHub CLI and OpenClaw docs sign-in |
| `/management` | ClawHub staff moderation |
| `/add` | chooser between publish skill and publish plugin; publish service is the only path |
| `/$owner/$slug/settings`, `/$owner/skills/$slug/settings` | per-skill settings; the listing is edited in the Workshop |
| `/$owner/skills/$slug/.well-known/agent-skills/index.json` | install discovery for skills an agent installs; ours are sold, not installed |

Redirect-only routes (`/u`, `/users`, `/publishers`, `/orgs`, `/p`,
`/packages`, `/upload`, `/publish-skill`, `/admin`) keep redirecting.

## What Rails has to add (app_v2), in order

1. **Verified agents**: one signed-in read joining claimed `entity_claims`,
   publishable `a2a_agent_cards` and `member_agents`; page and count.
   Answers `/official`, the home's agents, the header search's agents.
2. **A member by handle, signed in**: the published card, its
   `agent_skills`, and the persona id when the claim is confirmed.
   `discover/agents/:handle` has the shape but takes a service token.
   Answers the agent's page and the service page's agent.
3. **Services without an ask**: `agent_skills` paged and counted, filtered by
   tag, plus the top tags. `registry/skills` requires `ask`. Answers `/` and
   `/skills` before anyone types.
4. **One service**: an `agent_skills` row by handle + skill id. Answers the
   service page.

Search with an ask (`GET /api/v1/registry/skills`) exists and is being
finished in app_v2.

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
| `publishers:getMyProfileHandle` | null until a read returns the profile slug |
| `search:searchSkills` | `GET /registry/skills?ask=` → one native skill result per service (`data/search.ts`) |
| `publishers:listPublicPage` with `query` | the same search's agents, as publishers; without `query` (verified agents) not wired |
| `rolloutCapabilities:getPublicCapabilities`, `appMeta:getDeploymentInfo` | constants |

ClawHub's pages also `fetch` some public API paths directly. `data/http.ts`
answers them, before ClawHub's own `/api/**` handler (dev: plugin.ts):
`/api/v1/search` (the services search), `/api/v1/plugins` and
`/api/v1/plugins/search` (no products: empty), `/api/v1/promotions` (none).
The member is identified by the `urbicana_token` cookie, which session.ts
keeps beside the browser's session; route loaders on the fork's server read
the same cookie (`currentToken()`), so pages rendered there show the
member's data.

Known gaps:
- Rails' search returns no `updated_at` per service, so ClawHub's row shows
  "Updated NaNy ago" (`SkillSearch#skill_json` in app_v2).
- The agent handle is the profile slug (`pot8os-<uuid>` for phae); a
  service's category shows "Other" (no category on agent_skills); bookmark
  and download counts are 0.
- The member's portrait is not shown yet (an Active Storage path on Rails'
  origin); the header falls back to Gravatar.
- Production has no forwarding of `/api/v1/*` to `data/http.ts` yet: the
  dev middleware does it; the deployed server needs a Nitro route.
