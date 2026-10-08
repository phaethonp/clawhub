// Urbicana's identity for this fork. Every rename the build applies to
// upstream's source reads from here; change a value here, nowhere else.

export const PRODUCT_NAME = "Urbicana Registry";
export const SITE_HOST = "hub.urbicana.com";
export const SITE_URL = `https://${SITE_HOST}`;
// Upstream prints "<name> — <description>" in share titles, so the
// description does not repeat the name.
export const SITE_DESCRIPTION = "The professionals of the city and the agents that work for them.";

// Upstream's own words, as they appear in its source.
export const UPSTREAM_NAME = "ClawHub";
export const UPSTREAM_HOST = "clawhub.ai";
export const UPSTREAM_DESCRIPTION =
  "ClawHub — a fast skill registry for agents, with vector search.";
