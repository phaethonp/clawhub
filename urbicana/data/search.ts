// "Which agents offer this?": Rails' GET /api/v1/registry/skills?ask=,
// reshaped into the rows ClawHub's search draws.
//
// A service an agent offers (one skill on its A2A card, an agent_skills row)
// becomes one of ClawHub's native skill results; the agent offering it
// becomes a publisher. Rails groups the matches by agent; each agent's
// handle is its profile slug, so a service's page is /<handle>/<skill id>.

import { rails } from "./rails";

type RailsSkill = {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  origin?: string;
  price?: string | null;
  pricing_type?: string | null;
  delivery_format?: string | null;
  location?: string | null;
  similarity?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type RailsAgent = {
  handle: string;
  name?: string | null;
  url?: string | null;
  trust?: { verified_seller?: boolean; record_cited?: boolean };
  skills: RailsSkill[];
};

export type RailsSkillSearch = { query?: unknown; agents: RailsAgent[] };

type Context = { token?: string | null; origin?: string };

// One question asked twice within a moment (the service rows and the agent
// rows of the same search page) costs Rails one rewrite and one search.
const recent = new Map<string, { at: number; promise: Promise<RailsSkillSearch> }>();
const REUSE_MS = 30_000;

export function searchServices(ask: string, context: Context = {}) {
  const key = `${context.token ?? ""}|${ask}`;
  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < REUSE_MS) return hit.promise;
  const promise = rails<RailsSkillSearch>("/registry/skills", {
    query: { ask, limit: 50 },
    token: context.token,
    origin: context.origin,
  });
  recent.set(key, { at: Date.now(), promise });
  promise.catch(() => recent.delete(key));
  return promise;
}

function time(value?: string | null) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPublisher(agent: RailsAgent) {
  return {
    _id: `agent:${agent.handle}`,
    _creationTime: 0,
    kind: "user" as const,
    handle: agent.handle,
    displayName: agent.name?.trim() || agent.handle,
    image: undefined,
    bio: undefined,
    // ClawHub's "official" badge is Urbicana's verified agent: the card
    // cites the public record the member's claim was confirmed against.
    official: Boolean(agent.trust?.record_cited),
  };
}

function toNativeSkill(agent: RailsAgent, skill: RailsSkill) {
  const updatedAt = time(skill.updated_at);
  return {
    _id: `${agent.handle}/${skill.id}`,
    slug: skill.id,
    displayName: skill.name,
    summary: skill.description ?? null,
    icon: undefined,
    categories: [],
    topics: skill.tags ?? [],
    ownerUserId: `agent:${agent.handle}`,
    ownerPublisherId: null,
    stats: { downloads: 0, stars: 0 },
    updatedAt: updatedAt as number,
    createdAt: (time(skill.created_at) ?? updatedAt) as number,
  };
}

// ClawHub's CanonicalSkillSearchResult for one service.
export function toSearchResult(agent: RailsAgent, skill: RailsSkill) {
  const href = `/${encodeURIComponent(agent.handle)}/${encodeURIComponent(skill.id)}`;
  const publisher = toPublisher(agent);
  return {
    id: `${agent.handle}/${skill.id}`,
    source: "clawhub" as const,
    slug: skill.id,
    displayName: skill.name,
    summary: skill.description ?? null,
    icon: null,
    score: skill.similarity ?? 0,
    canonicalUrl: href,
    links: { canonical: href, source: agent.url ?? null },
    publisher: {
      kind: "user" as const,
      handle: agent.handle,
      displayName: publisher.displayName,
      image: null,
      official: publisher.official,
    },
    official: publisher.official,
    featured: false,
    install: { kind: "clawhub" as const, reference: `${agent.handle}/${skill.id}`, sourceUrl: null },
    sourceIdentity: { id: `${agent.handle}/${skill.id}`, owner: agent.handle, repo: null, host: null, lifetimeInstalls: null },
    trust: {
      visibility: "public" as const,
      installability: "installable" as const,
      clawHubVerdict: null,
      upstreamScanners: null,
      sourceFreshness: "native" as const,
    },
    metrics: { rolling60DayInstalls: null, bookmarks: null, updatedAt: time(skill.updated_at) ?? 0 },
    native: { skill: toNativeSkill(agent, skill), ownerHandle: agent.handle, owner: publisher },
  };
}

// Every service in a search, best match first.
export function toSearchResults(search: RailsSkillSearch, limit?: number) {
  const rows = search.agents.flatMap((agent) => agent.skills.map((skill) => toSearchResult(agent, skill)));
  rows.sort((a, b) => b.score - a.score);
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

// GET /api/v1/registry/services: services listed without a question.
type RailsServiceRow = {
  handle: string;
  agent: { name?: string | null; url?: string | null; verified?: boolean };
  service: RailsSkill;
};
export type RailsServicesPage = { services: RailsServiceRow[]; next_cursor: string | null; total: number };

function agentOf(row: RailsServiceRow): RailsAgent {
  return {
    handle: row.handle,
    name: row.agent.name,
    url: row.agent.url,
    trust: { record_cited: Boolean(row.agent.verified) },
    skills: [row.service],
  };
}

// ClawHub's home and catalogue listing entry ({ skill, ownerHandle, owner }).
export function toListingEntry(row: RailsServiceRow) {
  const agent = agentOf(row);
  return { skill: toNativeSkill(agent, row.service), ownerHandle: row.handle, owner: toPublisher(agent) };
}

// GET /api/v1/registry/agents: every agent with a publishable card.
type RailsAgentRow = {
  handle: string | null;
  name?: string | null;
  description?: string | null;
  url?: string | null;
  claimed?: boolean;
  services: RailsSkill[];
};
export type RailsAgentsPage = { agents: RailsAgentRow[]; next_cursor: string | null; total: number };

// No badge: whether a claimed agent is marked is not decided yet (phae,
// 2026-10-08); `claimed` is passed through Rails' answer and not shown.
export function toAgentListItem(agent: RailsAgentRow) {
  const item = toPublisherListItem({
    handle: agent.handle ?? "",
    name: agent.name,
    url: agent.url,
    skills: agent.services,
  });
  return { ...item, bio: agent.description ?? undefined, official: false };
}

// ClawHub's PublicPublisherListItem for one agent in a search.
export function toPublisherListItem(agent: RailsAgent) {
  return {
    ...toPublisher(agent),
    stats: { skills: agent.skills.length, packages: 0, installs: 0, downloads: 0, stars: 0 },
    publishedItems: agent.skills.map((skill) => ({
      kind: "skill" as const,
      displayName: skill.name,
      summary: skill.description ?? null,
      slug: skill.id,
    })),
  };
}
