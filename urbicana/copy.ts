// The words on ClawHub's pages, renamed to what Urbicana's pages hold
// (MAPPING.md): a skill is a service an agent offers, a plugin is a product,
// "official" becomes "Agents" for the agents page and "Verified" for the
// services tab, a creator or publisher is an agent.
//
// Each rule names the one upstream file it applies to and the exact phrase,
// so code that uses the same words (routes like /skills, api.skills.*,
// values compared against "Official") is never touched. The counts land in
// rename-manifest.json like every other rename; an upstream change to one of
// these phrases fails the check and names the file.

export const WORDS = {
  service: "Service",
  services: "Services",
  // ClawHub's plugins are Urbicana's city plugins (city-plugins.ts) and keep
  // the name; "Products" was dropped on 2026-10-08.
  product: "Plugin",
  products: "Plugins",
  verified: "Verified",
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
const WELCOME = "src/components/dashboard/DashboardWelcome.tsx";
const SKILLS_SH_DETAIL = "src/components/SkillsShCatalogDetail.tsx";
const PUBLISHERS_ROUTE = "src/routes/publishers/index.tsx";
const STYLES = "src/styles.css";
const ROOT_ROUTE = "src/routes/__root.tsx";
const NOT_FOUND = "src/components/GenericNotFoundPage.tsx";
const OG_ASSETS = "server/og/ogAssets.ts";
const HOME_AGENTS = "src/components/HomePopularPublishersSection.tsx";
const LIST_ROW = "src/components/SkillListingRow.tsx";
const PUBLISHER_ROW = "src/components/PublisherListItem.tsx";
const SEARCH = "src/routes/search.tsx";
const SERVICES = "src/routes/skills/index.tsx";
const SERVICES_RESULTS = "src/routes/skills/-SkillsResults.tsx";
const AGENTS_PAGE = "src/routes/official/index.tsx";
const PLUGINS_PAGE = "src/routes/plugins/index.tsx";
const PLUGIN_PAGE = "src/routes/plugins/$name.tsx";
const PUBLIC_API_URL = "src/lib/publicApiUrl.ts";
const PLUGIN_ROW = "src/components/PluginListItem.tsx";

const { service, services, products, product, verified, agents } = WORDS;

export const FILE_RULES: FileRule[] = [
  // The plugins catalogue is "Plug into your city" (city-plugins.ts); its
  // items come from data/http.ts.
  phrase(PLUGINS_PAGE, '<h1 className="browse-title">Plugins</h1>', '<h1 className="browse-title">Plug into your city</h1>'),
  phrase(PLUGINS_PAGE, '<h1 className="browse-title">\n            Plugins\n', '<h1 className="browse-title">\n            Plug into your city\n'),

  // Pages rendered on the server call ClawHub's public API at the Convex
  // site address, which Urbicana does not have. They call the fork itself,
  // which answers those paths (data/http.ts): URBICANA_SELF_ORIGIN in
  // development (plugin.ts), else this server's PORT on loopback.
  phrase(
    PUBLIC_API_URL,
    '  const base =\n    resolveAbsoluteBaseUrl(\n      getRuntimeEnv("VITE_CONVEX_SITE_URL"),\n      getRuntimeEnv("VITE_CONVEX_URL"),\n    ) ?? getRequiredRuntimeEnv("VITE_CONVEX_URL");\n  return new URL(normalizedPath, base);',
    '  const base =\n    process.env.URBICANA_SELF_ORIGIN ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`;\n  return new URL(normalizedPath, base);',
  ),

  // The catalogue's categories are the live cities (city-plugins.ts), with
  // ClawHub's sidebar and select; no download counts (nothing is downloaded).
  phrase(
    PLUGINS_PAGE,
    'import { PLUGIN_CATEGORIES, resolvePluginBrowseCategorySlug } from "../../lib/categories";',
    'import {\n  CITY_CATEGORIES as PLUGIN_CATEGORIES,\n  resolveCityCategory as resolvePluginBrowseCategorySlug,\n} from "../../../urbicana/city-plugins";',
  ),
  phrase(PLUGINS_PAGE, '\n                <span className="browse-list-head-label browse-list-head-stat">Downloads</span>', ""),
  phrase(
    PLUGIN_ROW,
    '\n      <div className="skill-list-item-meta">\n        <span className="skill-list-item-meta-item">\n          <Download size={14} aria-hidden="true" /> {downloads}\n        </span>\n      </div>',
    "",
  ),

  // A plugin's page is a city plugin's page (urbicana/pages/CityPlugin.tsx).
  // Its loader read ClawHub's package API; the city plugin is known here.
  {
    file: PLUGIN_PAGE,
    name: "copy:plugin page loader",
    pattern: /  loader: async \(\{ location, params \}\) => \{\n    const data = await loadPluginDetail\(params\.name\);[\s\S]*?\n    return data;\n  \},\n/g,
    to: "  loader: () => undefined,\n",
  },
  phrase(PLUGIN_PAGE, "  component: PluginDetailRoute,\n});", "  component: CityPluginRoute,\n});\n\nimport { CityPluginRoute } from \"../../../urbicana/pages/CityPlugin\";\nimport { cityPluginHeadData } from \"../../../urbicana/city-plugins\";"),
  // Its title and description: the city plugin's, through ClawHub's head.
  phrase(
    PLUGIN_PAGE,
    "head: ({ params, loaderData }) => pluginDetailHead(params.name, loaderData),",
    "head: ({ params }) => pluginDetailHead(params.name, cityPluginHeadData(params.name) as never),",
  ),
  // The tiles of ClawHub's home apps section read the home page's tokens;
  // ClawHub maps them onto the shared ones for its dashboard. The same
  // mapping for the plugin page, where a city plugin shows its tiles.
  phrase(STYLES, ".dashboard-route {\n  --dashboard-row-grid", ".dashboard-route,\n.plugin-detail-page {\n  --dashboard-row-grid"),

  // Navigation (header tabs and footer "Browse" / "Publish").
  phrase(NAV, 'label: "Skills"', `label: "${services}"`),
  phrase(NAV, 'label: "Plugins"', `label: "${products}"`),
  phrase(NAV, 'label: "Official"', `label: "${agents}"`),
  phrase(NAV, 'label: "Publish Skill"', 'label: "Add a service"'),
  // "Create org" is ClawHub's publisher organisations, not Urbicana's.
  {
    file: NAV,
    name: "copy:footer Create org",
    pattern: /\n      \{\n        kind: "link",\n        label: "Create org",\n        to: "\/settings",\n        search: \{ view: "organizations" \},\n      \},/g,
    to: "",
  },
  // Publishing a plugin is ClawHub's (code plugins); Urbicana's plugins are
  // its own (city-plugins.ts), so the footer offers adding a service only.
  {
    file: NAV,
    name: "copy:footer Publish Plugin",
    pattern: /\n      \{\n        kind: "link",\n        label: "Publish Plugin",[\s\S]*?\n        \},\n      \},/g,
    to: "",
  },
  phrase(REGISTRY, 'label: "Skills"', `label: "${services}"`),
  phrase(REGISTRY, 'label: "Plugins and packages"', `label: "${products}"`),
  phrase(REGISTRY, 'label: "Official"', `label: "${agents}"`),
  phrase(REGISTRY, "Browse official organizations publishing on ClawHub.", "Browse the agents on ClawHub."),

  // The header links nowhere outside Urbicana: ClawHub's only secondary item
  // is "Docs" -> docs.openclaw.ai/clawhub, drawn in the desktop rail, the
  // "More" menu and the mobile sheet. Urbicana has none: the people are
  // reached through the plugins (city-plugins.ts).
  {
    file: NAV,
    name: "copy:SECONDARY_NAV_ITEMS",
    pattern: /export const SECONDARY_NAV_ITEMS: NavItem\[\] = \[[\s\S]*?\n\];/g,
    to: "export const SECONDARY_NAV_ITEMS: NavItem[] = [];",
  },
  // Sign-in is the member's Urbicana account (data/auth.tsx), not GitHub.
  { file: HEADER, name: "copy:<GitHubLogo sign-in />", pattern: /<GitHubLogo className="github-sign-in-logo"[^>]*\/>/g, to: "" },

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

  // ClawHub hides secondary header items into its "More" menu below 1100px,
  // sized for its labels; Urbicana's (Services, Products, Agents,
  // Professionals) are ~85px wider, and between 1110px and 1280px the
  // secondary item slid under the centred search box. Same mechanism, wider
  // threshold (1370px, measured with the rule below).
  phrase(
    STYLES,
    "@media (max-width: 1100px) {\n  .navbar-calm-rail-link-secondary {",
    "@media (max-width: 1370px) {\n  .navbar-calm-rail-link-secondary {",
  ),

  // ClawHub's compact header (brand name hidden, tighter rail, compact Sign
  // in) applies from 761px to 1100px, sized for "ClawHub"; with "Urbicana
  // Registry" the rail and its More button reached under the search box
  // from 1105px to ~1210px. Same block, wider range.
  phrase(
    STYLES,
    "@media (max-width: 1100px) and (min-width: 761px) {\n  .navbar-top {\n    grid-template-columns: max-content max-content minmax(180px, 1fr) auto;",
    "@media (max-width: 1370px) and (min-width: 761px) {\n  .navbar-top {\n    grid-template-columns: max-content max-content minmax(180px, 1fr) auto;",
  ),

  // ClawHub folds the header rail into its mobile menu at 920px; Urbicana's
  // compact rail with its More button still reached under the search box up
  // to 975px. Same block, threshold 990px. (Thresholds measured 2026-10-08:
  // no header control under the search box at any width from 760 to 1440.)
  phrase(
    STYLES,
    "@media (max-width: 920px) {\n  .navbar-calm .navbar-calm-rail {",
    "@media (max-width: 990px) {\n  .navbar-calm .navbar-calm-rail {",
  ),

  // Hidden until there is Urbicana content for them: the footer's
  // scrolling band of ClawHub phrases (empty phrases leave the band blank).
  // [^>]*: in development TanStack's devtools add attributes to the tag.
  // The "Bring your skills to ClawHub" section is about ClawHub's CLI.
  { file: HOME_ROUTE, name: "copy:<HomeBringSkillsSection />", pattern: /\n[ \t]*<HomeBringSkillsSection[^>]*\/>/g, to: "" },
  // In the apps section's place: the cities section (urbicana/pages/CitySection.tsx).
  { file: HOME_ROUTE, name: "copy:<HomeAppsSection />", pattern: /<HomeAppsSection[^>]*\/>/g, to: "<CitySection />" },
  phrase(
    HOME_ROUTE,
    'import { HomeAppsSection } from "../components/HomeAppsSection";',
    'import { CitySection } from "../../urbicana/pages/CitySection";',
  ),
  {
    file: FOOTER,
    name: "copy:FOOTER_EASTER_ASCII",
    pattern: /const FOOTER_EASTER_ASCII = \[[\s\S]*?\n\];/g,
    to: 'const FOOTER_EASTER_ASCII = [""];',
  },

  // No GitHub profile pictures (phae, 2026-10-08): ClawHub falls back to
  // github.com/<handle>.png, which sends Urbicana handles to GitHub; without
  // an image the component draws its own placeholder.
  phrase(HOME_AGENTS, "publisher.image ?? `https://github.com/${publisher.handle}.png`", "publisher.image"),
  phrase(SKILLS_SH_DETAIL, "image: `https://github.com/${githubOwner}.png?size=96`,", "image: undefined,"),

  // Pages Urbicana does not serve answer not found (urbicana/switched-off.ts):
  // one check at the start of the root route's beforeLoad, which runs for
  // every route on the server and on client-side navigation.
  phrase(
    ROOT_ROUTE,
    "export const Route = createRootRoute({\n  beforeLoad: ({ location }) => {\n",
    'import { notFound as urbicanaNotFound } from "@tanstack/react-router";\nimport { isSwitchedOff } from "../../urbicana/switched-off";\n\nexport const Route = createRootRoute({\n  beforeLoad: ({ location }) => {\n    if (isSwitchedOff(location.pathname)) throw urbicanaNotFound();\n',
  ),

  // The not-found page those paths (and any unknown address) show.
  phrase(
    NOT_FOUND,
    "We couldn't find a skill, plugin, or profile at this URL. Try search, browse the\n              catalog, or publish the thing you expected to see here.",
    "We couldn't find a service, product, agent, or professional at this URL. Try search or\n              browse the catalogue.",
  ),

  // Share images the server draws (server/og/) look for Urbicana's artwork
  // first: urbicana/public/ in development (the server root is the project),
  // and the copies plugin.ts writes into the built server in production.
  phrase(
    OG_ASSETS,
    'getServerUrl("clawd-logo.png"),\n      getServerUrl("public/clawd-logo.png"),',
    'getServerUrl("urbicana/public/clawd-logo.png"),\n      getServerUrl("clawd-logo.png"),\n      getServerUrl("public/clawd-logo.png"),',
  ),
  phrase(
    OG_ASSETS,
    'getServerUrl("og-clawhub-watermark.png"),\n      getServerUrl("public/og-clawhub-watermark.png"),',
    'getServerUrl("urbicana/public/og-clawhub-watermark.png"),\n      getServerUrl("og-clawhub-watermark.png"),\n      getServerUrl("public/og-clawhub-watermark.png"),',
  ),
  phrase(
    OG_ASSETS,
    'getServerUrl("clawd-mark.png"),\n      getServerUrl("public/clawd-mark.png"),',
    'getServerUrl("urbicana/public/clawd-mark.png"),\n      getServerUrl("clawd-mark.png"),\n      getServerUrl("public/clawd-mark.png"),',
  ),

  // /publishers (upstream: a redirect to /official) is the professionals
  // directory: the people on the public record, per register
  // (urbicana/pages/Professionals.tsx, built from ClawHub's catalogue screen).
  phrase(
    PUBLISHERS_ROUTE,
    'export const Route = createFileRoute("/publishers/")({\n  beforeLoad: ({ search }) => {\n    throw redirect({ to: "/official", search, replace: true });\n  },\n});',
    'import { ProfessionalsPage } from "../../../urbicana/pages/Professionals";\n\nexport const Route = createFileRoute("/publishers/")({\n  component: ProfessionalsPage,\n});',
  ),

  // The home page's agents strip.
  jsxText(HOME_AGENTS, "Official creators", agents),
  phrase(HOME_AGENTS, "Explore skills and plugins from official creators.", "Explore the services and products agents offer."),
  phrase(HOME_AGENTS, "Browse official", "Browse agents"),
  phrase(HOME_AGENTS, "Official creator on ClawHub.", "Agent on ClawHub."),

  // Agent rows (search results, the agents page).
  phrase(PUBLISHER_ROW, '"Org publisher on ClawHub."', '"Business agent on ClawHub."'),
  phrase(PUBLISHER_ROW, '"Publisher on ClawHub."', '"Agent on ClawHub."'),

  // Header search and account menu.
  phrase(HEADER, "Search skills, plugins, and creators", "Search services, plugins, and agents"),
  phrase(HEADER, "Start typing to search skills, plugins, and creators", "Start typing to search services, plugins, and agents"),
  phrase(HEADER, "Unable to search skills. Please try again later.", "Unable to search services. Please try again later."),
  jsxText(HEADER, "Add skill or plugin", "Add a service"),
  phrase(HEADER, ': "Skill";', `: "${service}";`),

  // The dashboard's welcome screen (a member with no services yet).
  phrase(WELCOME, "Publish your first skill or plugin for others to discover and use.", "Add your first service for other agents to find and hire."),
  jsxText(WELCOME, "Add skill or plugin", "Add a service"),
  jsxText(WELCOME, "Skills", services),
  jsxText(WELCOME, "Plugins", products),
  jsxText(WELCOME, "Official", agents),
  // Its "Docs" link goes to docs.openclaw.ai: removed, like the header's.
  {
    file: WELCOME,
    name: "copy:welcome Docs link",
    pattern: /\n[ \t]*<a href=\{CLAWHUB_DOCS_URL\}[^>]*>\s*Docs\s*<ArrowUpRight[^>]*\/>\s*<\/a>/g,
    to: "",
  },

  // The footer links nowhere outside Urbicana (phae, 2026-10-08: "remove the
  // openclaw links from the footer"). Browse and Publish stay.
  {
    file: FOOTER,
    name: "copy:footer Explore docs",
    pattern: /\n[ \t]*<a\s+className="footer-v2-eco-link"[^>]*>\s*Explore docs\s*<ArrowUpRight[^>]*\/>\s*<\/a>/g,
    to: "",
  },
  {
    file: FOOTER,
    name: "copy:footer ecosystem strip",
    pattern: /\n[ \t]*<div className="footer-v2-eco" aria-label="OpenClaw ecosystem"[^>]*>[\s\S]*?(?=\n[ \t]*<div className="footer-v2-bottom")/g,
    to: "",
  },
  {
    file: NAV,
    name: "copy:footer Ecosystem and Community",
    pattern: /\n  \{\n    title: "Ecosystem",[\s\S]*?\n  \},\n  \{\n    title: "Community",[\s\S]*?\n  \},(?=\n\];)/g,
    to: "",
  },
  {
    file: NAV,
    name: "copy:FOOTER_PLATFORM_LINKS",
    pattern: /export const FOOTER_PLATFORM_LINKS = \[[\s\S]*?\] as const;/g,
    to: "export const FOOTER_PLATFORM_LINKS: ReadonlyArray<{ label: string; href: string }> = [];",
  },

  // phae, 2026-10-08: the copyright is Urbicana's, and the footer does not
  // link ClawHub's security-audit page (scans of installable skills and
  // plugins; Urbicana's services are hired, not installed).
  phrase(FOOTER, "© 2026 OpenClaw Foundation", "© 2026 Urbicana"),
  {
    file: NAV,
    name: "copy:footer Audits link",
    pattern: /\n      \{\n        kind: "link",\n        label: "Audits",[\s\S]*?\n      \},/g,
    to: "",
  },

  // Footer description.
  phrase(FOOTER, "Skills and plugins for OpenClaw agents. Part of the wider OpenClaw ecosystem.", "Services and products, found and sold agent to agent."),

  // The search page.
  phrase(SEARCH, "Search skills, plugins, and creators...", "Search services, plugins, and agents..."),
  jsxText(SEARCH, "Skills", services),
  jsxText(SEARCH, "Plugins", products),
  jsxText(SEARCH, "Creators", agents),
  phrase(SEARCH, 'title="Skills"', `title="${services}"`),
  phrase(SEARCH, 'title="Plugins"', `title="${products}"`),
  phrase(SEARCH, 'title="Creators"', `title="${agents}"`),
  jsxText(SEARCH, "Unable to search skills", "Unable to search services"),
  jsxText(SEARCH, "Unable to search plugins", "Unable to search plugins"),
  phrase(SEARCH, "The skill catalog is temporarily unavailable.", "Services are temporarily unavailable."),
  phrase(SEARCH, "The plugin catalog is temporarily unavailable.", "Plugins are temporarily unavailable."),
  jsxText(SEARCH, "Enter a search term to find skills, plugins, and creators", "Enter a search term to find services, plugins, and agents"),
  phrase(SEARCH, '"Show all plugins"', '"Show all plugins"'),
  phrase(SEARCH, '"Show all skills"', '"Show all services"'),
  phrase(SEARCH, '"Browse official organizations"', '"Browse agents"'),
  // The empty state's add link: a service only; plugins are Urbicana's own.
  {
    file: SEARCH,
    name: "copy:search add link",
    pattern: /<a\n {10}className="search-empty-action"\n {10}href=\{`\/add\?kind=\$\{activeType === "plugins" \? "plugin" : "skill"\}`\}\n {8}>\n {10}<Plus size=\{14\} aria-hidden="true" \/>\n {10}\{activeType === "plugins" \? "Add a plugin" : "Add a skill or plugin"\}\n {8}<\/a>/g,
    to: '{activeType === "plugins" ? null : (\n          <a className="search-empty-action" href="/add?kind=skill">\n            <Plus size={14} aria-hidden="true" />\n            Add a service\n          </a>\n        )}',
  },

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

  // The agents page (/official): every agent with a publishable card.
  phrase(AGENTS_PAGE, "`Official · ${SITE_NAME}`", "`Agents · ${SITE_NAME}`"),
  jsxText(AGENTS_PAGE, "Official", agents),
  phrase(AGENTS_PAGE, "The organizations behind the top skills and plugins on ClawHub", "The agents behind the services and products on ClawHub"),
  phrase(AGENTS_PAGE, '"Search official organizations..."', '"Search agents..."'),
  phrase(AGENTS_PAGE, '"Search official organizations"', '"Search agents"'),
  jsxText(AGENTS_PAGE, "No official organizations found", "No agents found"),
];
