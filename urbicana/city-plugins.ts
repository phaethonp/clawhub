// Urbicana's plugins: the city plugins a member plugs into, per city. ClawHub's
// plugins catalogue (/plugins) lists them and each has ClawHub's plugin page
// (/plugins/<name>). Wording of "Every discipline that builds the city." is
// phae's (2026-10-08 design); the "Plug into your city" line is the one phae
// chose from my proposal the same day.
//
// They are plugins for a member's city. Never "marketplace" or "platform",
// in the pages or in this code (phae, 2026-10-08: nobody joins a marketplace).
//
// A plugin's disciplines are the roles its register records
// (all_states_licensed_professionals.license_type), read from Rails.

export const PLUG_INTO_YOUR_CITY = {
  title: "Plug into your city",
  line: "Ready-made plugins that plug you straight into the professionals and businesses of your city.",
};

export type City = { id: string; label: string; live: boolean };

export const CITIES: City[] = [
  { id: "new-york", label: "New York", live: true },
  { id: "los-angeles", label: "Los Angeles", live: false },
  { id: "miami", label: "Miami", live: false },
  { id: "austin", label: "Austin", live: false },
  { id: "chicago", label: "Chicago", live: false },
  { id: "san-francisco", label: "San Francisco", live: false },
];

// The Plugins page's categories: the live cities (ClawHub's BrowseCategory).
export const CITY_CATEGORIES = CITIES.filter((city) => city.live).map((city) => ({
  slug: city.id,
  label: city.label,
  icon: "globe",
}));

export function resolveCityCategory(value: string | null | undefined) {
  return CITY_CATEGORIES.find((category) => category.slug === value)?.slug;
}


export type CityPlugin = {
  name: string;
  title: string;
  summary: string;
  eyebrow: string;
  // The cities it is offered in. Its disciplines are not listed here: they
  // are the roles the register records, read from Rails
  // (GET /server_b/registry/license_counts) by its page.
  cities: string[];
};

export const CITY_PLUGINS: CityPlugin[] = [
  {
    name: "city-disciplines",
    title: "Every discipline that builds the city.",
    summary:
      "The people behind New York's buildings and deals — curated, discipline by discipline, each one drawn from the public record.",
    eyebrow: "New York now · More cities soon",
    cities: ["new-york"],
  },
];

export function findCityPlugin(name: string) {
  return CITY_PLUGINS.find((plugin) => plugin.name === name) ?? null;
}

export function cityPluginsIn(cityId: string) {
  return CITY_PLUGINS.filter((plugin) => plugin.cities.includes(cityId));
}

// What ClawHub's plugin page head reads (detail.package) for a city plugin.
export function cityPluginHeadData(name: string) {
  const plugin = findCityPlugin(name);
  if (!plugin) return undefined;
  return { detail: { package: { name: plugin.name, displayName: plugin.title, summary: plugin.summary }, owner: null } };
}

// ClawHub's plugin list item (src/lib/packageApi.ts PackageListItem).
export function toPluginListItem(plugin: CityPlugin) {
  return {
    name: plugin.name,
    displayName: plugin.title,
    family: "bundle-plugin" as const,
    channel: "official" as const,
    isOfficial: false,
    summary: plugin.summary,
    ownerHandle: null,
    createdAt: 0,
    updatedAt: 0,
    stats: { downloads: 0, installs: 0, stars: 0, versions: 0 },
  };
}
