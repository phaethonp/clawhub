// How each ClawHub backend function is answered on Urbicana.
//
// ClawHub's pages call functions by name ("users:me", "search:searchSkills").
// This table is the whole mapping: name → Rails request → the shape the page
// expects. A name with no entry is not answered (its hook stays loading and
// a direct call rejects), which is how a page that is not wired yet shows.
// MAPPING.md says which page uses which name and what answers it.

import { RailsError, rails } from "./rails";
import {
  type RailsServiceRow,
  type RailsServicesPage,
  type RailsAgentsPage,
  searchServices,
  toListingEntry,
  toPublisherListItem,
  toSearchResults,
  toAgentListItem,
} from "./search";
import { currentToken } from "./session";

export type Handler = (args: Record<string, unknown>) => Promise<unknown>;

// GET /api/v1/auth/me, as ClawHub's users document.
type RailsMe = {
  user?: {
    id: number;
    name?: string | null;
    email?: string | null;
    slug?: string | null;
    created_at?: string;
  };
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

type RailsMyAgent = {
  handle: string | null;
  name?: string | null;
  card: { exists: boolean; publishable: boolean; missing: string[] };
  services: Parameters<typeof toAgentListItem>[0]["services"];
};

// The signed-in member's own agent; null for a visitor.
function myAgent() {
  return signedIn<RailsMyAgent>("/registry/me", {});
}

// A signed-in read; a visitor (no token) gets null rather than an error, so
// the page shows its empty state.
async function signedIn<T>(path: string, query: Record<string, string | number | undefined>) {
  if (!(await currentToken())) return null;
  try {
    return await rails<T>(path, { query });
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
  // The member's agent (GET /api/v1/registry/me): its handle is the profile
  // slug, which /auth/me does not return.
  "publishers:getMyProfileHandle": async () => (await myAgent())?.handle ?? null,
  // The dashboard's owner selector: the member's own agent, as owner.
  "publishers:listMine": async () => {
    const agent = await myAgent();
    if (!agent?.handle) return [];
    return [
      {
        publisher: toAgentListItem({
          handle: agent.handle,
          name: agent.name,
          services: agent.services,
        }),
        role: "owner",
      },
    ];
  },
  // The dashboard's items: the services the member's card offers.
  "skills:listDashboardPaginated": async () => {
    const agent = await myAgent();
    const page = (agent?.services ?? []).map(
      (service) =>
        toListingEntry({ handle: agent?.handle ?? "", agent: { name: agent?.name }, service })
          .skill,
    );
    return { page, isDone: true, continueCursor: "" };
  },
  // The dashboard's plugins: Urbicana's plugins are city plugins, not packages.
  "packages:list": async () => [],

  // Search: "which agents offer this?" (GET /api/v1/registry/skills?ask=).
  // Signed in only; a visitor's search returns nothing rather than an error.
  "search:searchSkills": async (args) => {
    const ask = String(args.query ?? "").trim();
    if (!ask || !(await currentToken())) return [];
    const limit = typeof args.limit === "number" ? args.limit : undefined;
    return toSearchResults(await searchServices(ask, { token: await currentToken() }), limit);
  },
  // With a query: the agents whose services match it. Without one: every
  // agent with a publishable card (GET /api/v1/registry/agents), for
  // /official and the home page. ClawHub asks /official for organisations
  // (kind: "org"); Urbicana's agents are people and businesses alike, so kind
  // is not used.
  "publishers:listPublicPage": async (args) => {
    const ask = String(args.query ?? "").trim();
    const pagination = (args.paginationOpts ?? {}) as { numItems?: number; cursor?: string | null };
    const numItems = Number(pagination.numItems ?? 25);
    if (!ask) {
      const response = await signedIn<RailsAgentsPage>("/registry/agents", {
        limit: numItems,
        cursor: pagination.cursor ?? undefined,
      });
      const agents = response?.agents ?? [];
      const total = response?.total ?? 0;
      const counts = { all: total, organizations: 0, individuals: total };
      return {
        page: agents.map(toAgentListItem),
        isDone: !response?.next_cursor,
        continueCursor: response?.next_cursor ?? "",
        counts,
        globalCounts: counts,
      };
    }
    const token = await currentToken();
    const agents = token ? (await searchServices(ask, { token })).agents : [];
    const page = agents.slice(0, numItems).map(toPublisherListItem);
    const counts = { all: agents.length, organizations: 0, individuals: agents.length };
    return {
      page,
      isDone: agents.length <= numItems,
      continueCursor: "",
      counts,
      globalCounts: counts,
    };
  },

  // Services without a question (GET /api/v1/registry/services): the home
  // listing's tabs and the /skills page. "updated" lists the most recently
  // changed first, "newest" the most recently created; officialOnly is the
  // verified agents' services; createdAfter is milliseconds (New tab).
  "skills:listPublicPageV4": async (args) => {
    const response = await signedIn<RailsServicesPage>("/registry/services", {
      limit: Number(args.numItems ?? 25),
      cursor: typeof args.cursor === "string" ? args.cursor : undefined,
      sort: args.sort === "newest" ? "newest" : "updated",
      verified: args.officialOnly ? "true" : undefined,
      created_after:
        typeof args.createdAfter === "number"
          ? new Date(args.createdAfter).toISOString()
          : undefined,
      tag: typeof args.categorySlug === "string" ? args.categorySlug : undefined,
    });
    const services = response?.services ?? [];
    return {
      page: services.map(toListingEntry),
      nextCursor: response?.next_cursor ?? null,
      hasMore: Boolean(response?.next_cursor),
    };
  },
  // One service's page (/$owner/skills/$slug): GET /api/v1/registry/services/
  // :handle/:skill_id, as ClawHub's skills document. The owner is the agent's
  // handle and the slug the service's id on its card; without an owner there
  // is no lookup. A service has no published versions, so latestVersion is
  // null and the page shows no readme or files.
  "skills:getBySlug": async (args) => {
    const owner = String(args.ownerHandle ?? "")
      .trim()
      .replace(/^@+/, "");
    const slug = String(args.slug ?? "").trim();
    if (!owner || !slug) return null;
    let row: RailsServiceRow | null;
    try {
      row = await signedIn<RailsServiceRow>(
        `/registry/services/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`,
        {},
      );
    } catch (error) {
      if (error instanceof RailsError && error.status === 404) return null;
      throw error;
    }
    if (!row) return null;
    const entry = toListingEntry(row);
    return {
      requestedSlug: slug,
      resolvedSlug: slug,
      skill: entry.skill,
      latestVersion: null,
      owner: entry.owner,
      moderationInfo: null,
      forkOf: null,
      canonical: null,
    };
  },

  // What a service's page reads besides the service, none of which Urbicana
  // has: services have no published versions, no related-by-category list
  // and no evaluation. Answered empty so the page does not wait on them.
  "skills:listVersions": async () => [],
  "skills:listRelatedByCategory": async () => ({ items: [] }),
  "skillEvaluations:getCurrentForSkill": async () => null,

  // The "All" tab (ClawHub's Featured): no curation on Urbicana, so every
  // service, most recently updated first; with a query, the services search.
  "featuredSkills:listPublic": async (args) => {
    const ask = String(args.query ?? "").trim();
    if (ask) {
      const token = await currentToken();
      const search = token ? await searchServices(ask, { token }) : { agents: [] };
      return {
        page: search.agents.flatMap((agent) =>
          agent.skills.map((skill) =>
            toListingEntry({
              handle: agent.handle,
              agent: { name: agent.name, url: agent.url, verified: agent.trust?.record_cited },
              service: skill,
            }),
          ),
        ),
      };
    }
    const response = await signedIn<RailsServicesPage>("/registry/services", {
      limit: 100,
      sort: "updated",
    });
    return { page: (response?.services ?? []).map(toListingEntry) };
  },
  "skills:countPublicSkills": async () => {
    const response = await signedIn<RailsServicesPage>("/registry/services", { limit: 1 });
    return response?.total ?? 0;
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
