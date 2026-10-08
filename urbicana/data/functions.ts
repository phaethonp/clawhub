// How each ClawHub backend function is answered on Urbicana.
//
// ClawHub's pages call functions by name ("users:me", "search:searchSkills").
// This table is the whole mapping: name → Rails request → the shape the page
// expects. A name with no entry is not answered (its hook stays loading and
// a direct call rejects), which is how a page that is not wired yet shows.
// MAPPING.md says which page uses which name and what answers it.

import { RailsError, rails } from "./rails";
import { searchServices, toPublisherListItem, toSearchResults } from "./search";
import { currentToken } from "./session";

export type Handler = (args: Record<string, unknown>) => Promise<unknown>;

// GET /api/v1/auth/me, as ClawHub's users document.
type RailsMe = {
  user?: { id: number; name?: string | null; email?: string | null; slug?: string | null; created_at?: string };
};

async function me() {
  if (!(await currentToken())) return null;
  try {
    const response = await rails<RailsMe>("/auth/me");
    const user = response.user;
    if (!user) return null;
    return {
      _id: `user:${user.id}`,
      _creationTime: user.created_at ? Date.parse(user.created_at) : Date.now(),
      name: user.name ?? undefined,
      displayName: user.name ?? undefined,
      email: user.email ?? undefined,
      handle: user.slug ?? undefined,
      // The portrait is an Active Storage path on Rails' origin; shown once
      // the fork forwards those paths too.
      image: undefined,
      role: "user" as const,
    };
  } catch (error) {
    if (error instanceof RailsError && error.status === 401) return null;
    throw error;
  }
}

const PUBLIC_CAPABILITIES = {
  environment: "production",
  catalogDiscovery: { apiVersion: 1, canonicalTrendingEnabled: false },
  skillsSh: {
    mode: "off",
    runtimeEnabled: false,
    discoveryEnabled: false,
    writesEnabled: false,
    publicCatalogEnabled: false,
    scanPlanningEnabled: false,
    scanAdmissionEnabled: false,
  },
  githubSkillSync: { mode: "off", selfServiceEnabled: false },
};

export const FUNCTIONS: Record<string, Handler> = {
  // The signed-in member.
  "users:me": me,
  "users:ensure": me,
  // The member's agent handle is their profile slug, which /auth/me does not
  // return; no link until a read returns it.
  "publishers:getMyProfileHandle": async () => null,

  // Search: "which agents offer this?" (GET /api/v1/registry/skills?ask=).
  // Signed in only; a visitor's search returns nothing rather than an error.
  "search:searchSkills": async (args) => {
    const ask = String(args.query ?? "").trim();
    if (!ask || !(await currentToken())) return [];
    const limit = typeof args.limit === "number" ? args.limit : undefined;
    return toSearchResults(await searchServices(ask, { token: await currentToken() }), limit);
  },
  // With a query: the agents whose services match it. Without one it is
  // the verified-agents list (/official, the home page), not built yet.
  "publishers:listPublicPage": async (args) => {
    const ask = String(args.query ?? "").trim();
    if (!ask) {
      // Verified agents: the Rails read does not exist yet (MAPPING.md). An
      // empty page lets /official and the home page render their empty
      // state; throwing here failed /official's loader with a 500.
      notWiredYet("publishers:listPublicPage (verified agents)");
      const none = { all: 0, organizations: 0, individuals: 0 };
      return { page: [], isDone: true, continueCursor: "", counts: none, globalCounts: none };
    }
    const numItems = Number((args.paginationOpts as { numItems?: number } | undefined)?.numItems ?? 25);
    const token = await currentToken();
    const agents = token ? (await searchServices(ask, { token })).agents : [];
    const page = agents.slice(0, numItems).map(toPublisherListItem);
    const counts = { all: agents.length, organizations: 0, individuals: agents.length };
    return { page, isDone: agents.length <= numItems, continueCursor: "", counts, globalCounts: counts };
  },

  // Constants: ClawHub's rollout switches, all off here.
  "rolloutCapabilities:getPublicCapabilities": async () => PUBLIC_CAPABILITIES,
  "appMeta:getDeploymentInfo": async () => ({ appBuildSha: null, deployedAt: null }),
};

// Functions ClawHub declares as actions but that only read: running one does
// not refetch every cached query afterwards.
export const READ_ONLY = new Set(["search:searchSkills"]);

const warned = new Set<string>();

function notWiredYet(name: string) {
  if (warned.has(name)) return;
  warned.add(name);
  if (typeof console !== "undefined") console.info(`[urbicana] not wired yet: ${name}`);
}

export function handlerFor(name: string): Handler | null {
  const handler = FUNCTIONS[name];
  if (!handler) notWiredYet(name);
  return handler ?? null;
}
