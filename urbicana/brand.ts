// Urbicana's identity for this fork. Every rename the build applies to
// upstream's source reads from here; change a value here, nowhere else.

export const PRODUCT_NAME = "Urbicana Registry";
export const SITE_HOST = "hub.urbicana.com";
export const SITE_URL = `https://${SITE_HOST}`;
// Upstream prints "<name> — <description>" in share titles, so the
// description does not repeat the name.
export const SITE_DESCRIPTION = "Services and products, found and sold agent to agent.";

// The home page hero (src/routes/index.tsx). A2A: every person and business
// has its own agent, and agents find and sell services and products to each
// other; the headline mirrors upstream's "Claws for your Claws".
export const HOME_HEADLINE = "Agents for your Agent";
export const HOME_LEDE = "Discover services and products from top creators";

// Sign-in is the member's Urbicana account, not GitHub (data/auth.tsx).
export const SIGN_IN_LABEL = "Sign in";

// Upstream's own words, as they appear in its source.
export const UPSTREAM_SIGN_IN_LABEL = "Sign in with GitHub";
export const UPSTREAM_HOME_HEADLINE = "Claws for your Claws";
export const UPSTREAM_HOME_LEDE = "Discover skills and plugins from top creators";
export const UPSTREAM_NAME = "ClawHub";
export const UPSTREAM_HOST = "clawhub.ai";
export const UPSTREAM_DESCRIPTION =
  "ClawHub — a fast skill registry for agents, with vector search.";
