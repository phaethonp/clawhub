// ClawHub's public HTTP API paths that its pages fetch directly (not through
// the function table), answered on Urbicana. The fork's server routes
// requests here before ClawHub's own /api/** handler (plugin.ts in dev).
// The member is identified by the session cookie (session.ts).

import { MARKETPLACES, toPluginListItem } from "../marketplaces";
import { searchServices, toSearchResults } from "./search";

export { tokenFromCookie } from "./session";

type Route = (url: URL, token: string | null, railsOrigin: string) => Promise<{ status: number; body: unknown }>;

export const HTTP_ROUTES: Record<string, Route> = {
  // fetchSkillSearch (src/lib/skillSearchApi.ts): { results: CanonicalSkillSearchResult[] }
  "/api/v1/search": async (url, token, railsOrigin) => {
    const ask = (url.searchParams.get("q") ?? "").trim();
    const limit = Number(url.searchParams.get("limit") ?? "25");
    if (!ask || !token) return { status: 200, body: { results: [] } };
    const search = await searchServices(ask, { token, origin: railsOrigin });
    return { status: 200, body: { results: toSearchResults(search, Number.isFinite(limit) ? limit : 25) } };
  },

  // ClawHub's plugins are Urbicana's marketplaces (marketplaces.ts).
  "/api/v1/plugins/search": async (url) => {
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const results = MARKETPLACES.filter((marketplace) =>
      `${marketplace.title} ${marketplace.summary}`.toLowerCase().includes(q),
    ).map((marketplace) => ({ score: 1, package: toPluginListItem(marketplace) }));
    return { status: 200, body: { results } };
  },
  "/api/v1/plugins": async () => ({
    status: 200,
    body: { items: MARKETPLACES.map(toPluginListItem), nextCursor: null, totalCount: MARKETPLACES.length },
  }),

  // ClawHub's header promotions: none on Urbicana.
  "/api/v1/promotions": async () => ({ status: 200, body: { promotions: [] } }),
};
