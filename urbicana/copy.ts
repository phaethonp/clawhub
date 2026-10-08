// The words on ClawHub's pages, renamed to what Urbicana's pages hold
// (MAPPING.md): a skill is a service an agent offers, a plugin is a product,
// "official" is a verified agent, a creator or publisher is an agent.
//
// Each rule names the one upstream file it applies to and the exact phrase,
// so code that uses the same words (routes like /skills, api.skills.*,
// values compared against "Official") is never touched. The counts land in
// rename-manifest.json like every other rename; an upstream change to one of
// these phrases fails the check and names the file.

export const WORDS = {
  service: "Service",
  services: "Services",
  product: "Product",
  products: "Products",
  verified: "Verified",
  verifiedAgents: "Verified agents",
  agents: "Agents",
} as const;

export type FileRule = { file: string; name: string; pattern: RegExp; to: string };

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A phrase exactly as written in the file.
function phrase(file: string, from: string, to: string): FileRule {
  return { file, name: `copy:${from}`, pattern: new RegExp(escape(from), "g"), to };
}

// A JSX text node: the phrase alone between a tag's > and the next <, with
// whatever line breaks and indentation the file puts around it.
function jsxText(file: string, from: string, to: string): FileRule {
  return {
    file,
    name: `copy:>${from}<`,
    pattern: new RegExp(`(>\\s*)${escape(from)}(\\s*<)`, "g"),
    to: `$1${to}$2`,
  };
}

const NAV = "src/lib/nav-items.ts";
const TABS = "src/lib/catalogTabs.ts";
const REGISTRY = "src/lib/publicRegistry.ts";
const HEADER = "src/components/Header.tsx";
const FOOTER = "src/components/Footer.tsx";
const HOME_LIST = "src/components/HomeListingSection.tsx";
const HOME_DATA = "src/lib/homeListingData.ts";
const HOME_ROUTE = "src/routes/index.tsx";
const HOME_AGENTS = "src/components/HomePopularPublishersSection.tsx";
const LIST_ROW = "src/components/SkillListingRow.tsx";
const PUBLISHER_ROW = "src/components/PublisherListItem.tsx";
const SEARCH = "src/routes/search.tsx";
const SERVICES = "src/routes/skills/index.tsx";
const SERVICES_RESULTS = "src/routes/skills/-SkillsResults.tsx";
const VERIFIED = "src/routes/official/index.tsx";

const { service, services, products, product, verified, verifiedAgents, agents } = WORDS;

export const FILE_RULES: FileRule[] = [
  // Navigation (header tabs and footer "Browse" / "Publish").
  phrase(NAV, 'label: "Skills"', `label: "${services}"`),
  phrase(NAV, 'label: "Plugins"', `label: "${products}"`),
  phrase(NAV, 'label: "Official"', `label: "${verified}"`),
  phrase(NAV, 'label: "Publish Skill"', 'label: "Add a service"'),
  phrase(NAV, 'label: "Publish Plugin"', 'label: "Add a product"'),
  phrase(REGISTRY, 'label: "Skills"', `label: "${services}"`),
  phrase(REGISTRY, 'label: "Plugins and packages"', `label: "${products}"`),
  phrase(REGISTRY, 'label: "Official"', `label: "${verifiedAgents}"`),
  phrase(REGISTRY, "Browse official organizations publishing on ClawHub.", "Browse the verified agents on ClawHub."),

  // The home page's catalogue tabs and content-type switch. "Featured" has no
  // curation behind it on Urbicana: the tab lists every service, most
  // recently updated first (featuredSkills:listPublic in data/functions.ts).
  phrase(TABS, 'label: "Featured"', 'label: "All"'),
  phrase(TABS, 'label: "Official"', `label: "${verified}"`),
  jsxText(HOME_LIST, "Plugins", products),
  jsxText(HOME_LIST, "Skills", services),
  jsxText(HOME_LIST, "Plugin", product),
  phrase(HOME_LIST, '"Search skills..."', `"Search ${services.toLowerCase()}..."`),
  phrase(HOME_LIST, '"Search plugins..."', `"Search ${products.toLowerCase()}..."`),
  phrase(HOME_LIST, '"Search skills"', `"Search ${services.toLowerCase()}"`),
  phrase(HOME_LIST, '"Search plugins"', `"Search ${products.toLowerCase()}"`),
  jsxText(LIST_ROW, "Skill", service),

  // The home page opens on services, not products: ClawHub opens on plugins,
  // which have no source on Urbicana and would always show an empty shelf.
  phrase(
    HOME_DATA,
    'const result = await fetchHomePluginListing("featured", [], HOME_LISTING_PAGE_SIZE);\n  return {\n    kind: "plugins",\n    tab: "featured",\n    categorySlugs: [],\n    fetchLimit: HOME_LISTING_PAGE_SIZE,\n    items: result.items,',
    'const result = await fetchHomeSkillListing("featured", [], HOME_LISTING_PAGE_SIZE);\n  return {\n    kind: "skills",\n    tab: "featured",\n    categorySlugs: [],\n    fetchLimit: HOME_LISTING_PAGE_SIZE,\n    items: result.page,',
  ),
  phrase(HOME_LIST, 'useState<ListingKind>(initialListing?.kind ?? "plugins")', 'useState<ListingKind>(initialListing?.kind ?? "skills")'),

  // Hidden until there is Urbicana content for them: the home page's grid of
  // apps ClawHub's skills plug into (src/lib/homeApps.ts), and the footer's
  // scrolling band of ClawHub phrases (empty phrases leave the band blank).
  // [^>]*: in development TanStack's devtools add attributes to the tag.
  { file: HOME_ROUTE, name: "copy:<HomeAppsSection />", pattern: /\n[ \t]*<HomeAppsSection[^>]*\/>/g, to: "" },
  {
    file: FOOTER,
    name: "copy:FOOTER_EASTER_ASCII",
    pattern: /const FOOTER_EASTER_ASCII = \[[\s\S]*?\n\];/g,
    to: 'const FOOTER_EASTER_ASCII = [""];',
  },

  // The home page's agents strip.
  jsxText(HOME_AGENTS, "Official creators", verifiedAgents),
  phrase(HOME_AGENTS, "Explore skills and plugins from official creators.", "Explore services and products from verified agents."),
  phrase(HOME_AGENTS, "Browse official", "Browse verified agents"),
  phrase(HOME_AGENTS, "Official creator on ClawHub.", "Verified agent on ClawHub."),

  // Agent rows (search results, the verified list).
  phrase(PUBLISHER_ROW, '"Org publisher on ClawHub."', '"Business agent on ClawHub."'),
  phrase(PUBLISHER_ROW, '"Publisher on ClawHub."', '"Agent on ClawHub."'),

  // Header search and account menu.
  phrase(HEADER, "Search skills, plugins, and creators", "Search services, products, and agents"),
  phrase(HEADER, "Start typing to search skills, plugins, and creators", "Start typing to search services, products, and agents"),
  phrase(HEADER, "Unable to search skills. Please try again later.", "Unable to search services. Please try again later."),
  jsxText(HEADER, "Add skill or plugin", "Add a service or product"),
  phrase(HEADER, ': "Skill";', `: "${service}";`),

  // Footer description.
  phrase(FOOTER, "Skills and plugins for OpenClaw agents. Part of the wider OpenClaw ecosystem.", "Services and products, found and sold agent to agent."),

  // The search page.
  phrase(SEARCH, "Search skills, plugins, and creators...", "Search services, products, and agents..."),
  jsxText(SEARCH, "Skills", services),
  jsxText(SEARCH, "Plugins", products),
  jsxText(SEARCH, "Creators", agents),
  phrase(SEARCH, 'title="Skills"', `title="${services}"`),
  phrase(SEARCH, 'title="Plugins"', `title="${products}"`),
  phrase(SEARCH, 'title="Creators"', `title="${agents}"`),
  jsxText(SEARCH, "Unable to search skills", "Unable to search services"),
  jsxText(SEARCH, "Unable to search plugins", "Unable to search products"),
  phrase(SEARCH, "The skill catalog is temporarily unavailable.", "Services are temporarily unavailable."),
  phrase(SEARCH, "The plugin catalog is temporarily unavailable.", "Products are temporarily unavailable."),
  jsxText(SEARCH, "Enter a search term to find skills, plugins, and creators", "Enter a search term to find services, products, and agents"),
  phrase(SEARCH, '"Show all plugins"', '"Show all products"'),
  phrase(SEARCH, '"Show all skills"', '"Show all services"'),
  phrase(SEARCH, '"Browse official organizations"', '"Browse verified agents"'),
  phrase(SEARCH, '"Add a skill or plugin"', '"Add a service or product"'),
  phrase(SEARCH, '"Add a plugin"', '"Add a product"'),

  // The services page (/skills).
  // [^>]*: in development TanStack's devtools add attributes to the tag
  // before this rule sees the code.
  { file: SERVICES, name: "copy:h1 Skills", pattern: /(<h1 className="browse-title"[^>]*>\s*)Skills(\s*\{)/g, to: `$1${services}$2` },
  phrase(SERVICES, '"Search skills..."', '"Search services..."'),
  phrase(SERVICES, '"Skill categories"', '"Service categories"'),
  jsxText(SERVICES, "Unable to search skills. Refresh to retry.", "Unable to search services. Refresh to retry."),
  jsxText(SERVICES_RESULTS, "Skills couldn't be loaded", "Services couldn't be loaded"),
  jsxText(SERVICES_RESULTS, "No skills found", "No services found"),
  jsxText(SERVICES_RESULTS, "Skill", service),

  // The verified agents page (/official).
  phrase(VERIFIED, "`Official · ${SITE_NAME}`", "`Verified agents · ${SITE_NAME}`"),
  jsxText(VERIFIED, "Official", verifiedAgents),
  phrase(VERIFIED, "The organizations behind the top skills and plugins on ClawHub", "The agents behind the services and products on ClawHub"),
  phrase(VERIFIED, '"Search official organizations..."', '"Search verified agents..."'),
  phrase(VERIFIED, '"Search official organizations"', '"Search verified agents"'),
  jsxText(VERIFIED, "No official organizations found", "No verified agents found"),
];
