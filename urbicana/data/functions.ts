// How each ClawHub backend function is answered on Urbicana.
//
// ClawHub's pages call functions by name ("users:me", "search:searchSkills").
// This table is the whole mapping: name → Rails request → the shape the page
// expects. A name with no entry is not answered (its hook stays loading and
// a direct call rejects), which is how a page that is not wired yet shows.
// MAPPING.md says which page uses which name and what answers it.

import { RailsError, rails } from "./rails";
import { session } from "./session";

export type Handler = (args: Record<string, unknown>) => Promise<unknown>;

// GET /api/v1/auth/me, as ClawHub's users document.
type RailsMe = {
  user?: { id: number; name?: string | null; email?: string | null; slug?: string | null; created_at?: string };
};

async function me() {
  if (!session.isSignedIn()) return null;
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

  // Constants: ClawHub's rollout switches, all off here.
  "rolloutCapabilities:getPublicCapabilities": async () => PUBLIC_CAPABILITIES,
  "appMeta:getDeploymentInfo": async () => ({ appBuildSha: null, deployedAt: null }),
};

const warned = new Set<string>();

export function handlerFor(name: string): Handler | null {
  const handler = FUNCTIONS[name];
  if (!handler && !warned.has(name)) {
    warned.add(name);
    if (typeof console !== "undefined") console.info(`[urbicana] not wired yet: ${name}`);
  }
  return handler ?? null;
}
