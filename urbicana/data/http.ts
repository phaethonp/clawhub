// ClawHub's public HTTP API paths that its pages fetch directly (not through
// the function table), answered on Urbicana. The fork's server routes
// requests here before ClawHub's own /api/** handler (plugin.ts in dev).
// The member is identified by the session cookie (session.ts).

import { CITY_PLUGINS, cityPluginsIn, findCityPlugin, toPluginListItem } from "../city-plugins";
import { searchServices, toSearchResults } from "./search";

export { tokenFromCookie } from "./session";

type Answer = { status: number; body: unknown; contentType?: string };
type Route = (url: URL, token: string | null, railsOrigin: string) => Promise<Answer>;

export const HTTP_ROUTES: Record<string, Route> = {
  // fetchSkillSearch (src/lib/skillSearchApi.ts): { results: CanonicalSkillSearchResult[] }
  "/api/v1/search": async (url, token, railsOrigin) => {
    const ask = (url.searchParams.get("q") ?? "").trim();
    const limit = Number(url.searchParams.get("limit") ?? "25");
    if (!ask || !token) return { status: 200, body: { results: [] } };
    const search = await searchServices(ask, { token, origin: railsOrigin });
    return { status: 200, body: { results: toSearchResults(search, Number.isFinite(limit) ? limit : 25) } };
  },

  // ClawHub's plugins are Urbicana's city plugins (city-plugins.ts).
  "/api/v1/plugins/search": async (url) => {
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const results = CITY_PLUGINS.filter((plugin) =>
      `${plugin.title} ${plugin.summary}`.toLowerCase().includes(q),
    ).map((plugin) => ({ score: 1, package: toPluginListItem(plugin) }));
    return { status: 200, body: { results } };
  },
  "/api/v1/plugins": async (url) => {
    const city = url.searchParams.get("category");
    const plugins = city ? cityPluginsIn(city) : CITY_PLUGINS;
    return {
      status: 200,
      body: { items: plugins.map(toPluginListItem), nextCursor: null, totalCount: plugins.length },
    };
  },

  // ClawHub's header promotions: none on Urbicana.
  "/api/v1/promotions": async () => ({ status: 200, body: { promotions: [] } }),
};

// ClawHub's plugin page (src/routes/plugins/$name.tsx) reads a plugin from
// the package API: its detail, its versions and its README. For a city
// plugin these answer from Urbicana's data, so ClawHub's page renders as it
// does on clawhub.ai. The README lists each directory under its declared
// name with the roles it records and their counts, read from Rails as the
// member; the version is the date those counts were read.
const PACKAGE_PATH = /^\/api\/v1\/packages\/([^/]+)(\/versions(?:\/([^/]+))?|\/file)?$/;

export function httpRouteFor(path: string): Route | undefined {
  if (HTTP_ROUTES[path]) return HTTP_ROUTES[path];
  const match = PACKAGE_PATH.exec(path);
  if (!match) return undefined;
  const plugin = findCityPlugin(decodeURIComponent(match[1]));
  const part = match[2] ?? "";
  return async (url, token, railsOrigin) => {
    if (!plugin) return { status: 404, body: { error: "Not found" } };
    const version = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const identity = { name: plugin.name, displayName: plugin.title, family: "bundle-plugin" as const };
    if (part === "") {
      return {
        status: 200,
        body: {
          package: {
            ...identity,
            channel: "official",
            isOfficial: false,
            summary: plugin.summary,
            ownerHandle: null,
            createdAt: now,
            updatedAt: now,
            latestVersion: version,
            categories: [],
            topics: [],
            tags: {},
          },
          owner: null,
        },
      };
    }
    if (part === "/versions") {
      return { status: 200, body: { items: [{ version, createdAt: now, changelog: "" }], nextCursor: null } };
    }
    if (part.startsWith("/versions/")) {
      return {
        status: 200,
        body: {
          package: identity,
          version: { version, createdAt: now, changelog: "", files: [{ path: "README.md", size: 0, sha256: "" }] },
        },
      };
    }
    if (url.searchParams.get("path") !== "README.md") return { status: 404, body: { error: "Not found" } };
    if (!token) return { status: 403, body: "" , contentType: "text/plain" };
    return { status: 200, body: await cityPluginReadme(token, railsOrigin), contentType: "text/plain; charset=utf-8" };
  };
}

async function railsGet<T>(origin: string, token: string, path: string): Promise<T> {
  const response = await fetch(`${origin}/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Rails ${path}: ${response.status}`);
  return (await response.json()) as T;
}

// One section per directory, under its declared name; one line per role it
// records, most first. DOB writes licence types in capitals; labels are
// sentence case (openclaw-brand).
async function cityPluginReadme(token: string, origin: string) {
  const [roles, meanings, contractors] = await Promise.all([
    railsGet<Record<string, number>>(origin, token, "/server_b/registry/license_counts"),
    railsGet<Record<string, { meaning: string }>>(origin, token, "/server_b/registry/code_meanings?domain=applicant_professional_title"),
    railsGet<{ contractor_licenses: Array<{ label: string; count: number }> }>(origin, token, "/server_b/registry/contractor_licenses"),
  ]);
  const sentenceCase = (raw: string) => raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const directory = (source: string) => sentenceCase(source.replace(/_/g, " "));
  const lines = [`## ${directory("all_states_licensed_professionals")}`, ""];
  for (const [code, people] of Object.entries(roles).sort((a, b) => b[1] - a[1])) {
    const name = meanings[code]?.meaning;
    lines.push(`- ${name ? `**${name}** (${code})` : `**${code}**`}: ${people.toLocaleString("en-US")}`);
  }
  lines.push("", `## ${directory("contractor_licenses_nyc")}`, "");
  for (const entry of [...contractors.contractor_licenses].sort((a, b) => b.count - a.count)) {
    lines.push(`- **${sentenceCase(entry.label)}**: ${entry.count.toLocaleString("en-US")}`);
  }
  return `${lines.join("\n")}\n`;
}
