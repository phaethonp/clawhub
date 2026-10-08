// Urbicana's plugins: the marketplaces a member plugs into, per city. ClawHub's
// plugins catalogue (/plugins) lists them and each has ClawHub's plugin page
// (/plugins/<name>). Wording of "Every discipline that builds the city." is
// phae's (2026-10-08 design); the "Plug into your city" line is the one phae
// chose from my proposal the same day.
//
// Which registers each discipline covers is the mapping that comes next,
// built by a tool; until then a discipline opens the professionals list.

export const PLUG_INTO_YOUR_CITY = {
  title: "Plug into your city",
  line: "Ready-made marketplaces that plug you straight into the professionals and businesses of your city.",
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

export type Discipline = { id: string; name: string; description?: string; source: string };

export type Marketplace = {
  name: string;
  title: string;
  summary: string;
  eyebrow: string;
  // Disciplines per live city id.
  disciplines: Record<string, Discipline[]>;
};

export const MARKETPLACES: Marketplace[] = [
  {
    name: "city-disciplines",
    title: "Every discipline that builds the city.",
    summary:
      "The people behind New York's buildings and deals — curated, discipline by discipline, each one drawn from the public record.",
    eyebrow: "New York now · More cities soon",
    disciplines: {
      "new-york": [
        {
          id: "architects",
          name: "Architects",
          description: "Registered architects filing new builds and adaptive reuse across the boroughs.",
          source: "On record · DOB",
        },
        {
          id: "developers",
          name: "Developers",
          description: "The owners and sponsors assembling sites and moving deals.",
          source: "On record · ACRIS",
        },
        {
          id: "general-contractors",
          name: "General Contractors",
          description: "The firms that put the work in place, permit by permit.",
          source: "On record · DOB",
        },
        {
          id: "structural-engineers",
          name: "Structural Engineers",
          description: "The PEs behind facades, foundations, and FISP cycles.",
          source: "On record · DOB",
        },
        // Its line is cut off in the design; added when phae gives it.
        { id: "electricians", name: "Electricians", source: "On record · DOB" },
      ],
    },
  },
];

export function findMarketplace(name: string) {
  return MARKETPLACES.find((marketplace) => marketplace.name === name) ?? null;
}

export function marketplacesIn(cityId: string) {
  return MARKETPLACES.filter((marketplace) => marketplace.disciplines[cityId]?.length);
}

// ClawHub's plugin list item (src/lib/packageApi.ts PackageListItem).
export function toPluginListItem(marketplace: Marketplace) {
  return {
    name: marketplace.name,
    displayName: marketplace.title,
    family: "bundle-plugin" as const,
    channel: "official" as const,
    isOfficial: false,
    summary: marketplace.summary,
    ownerHandle: null,
    createdAt: 0,
    updatedAt: 0,
    stats: { downloads: 0, installs: 0, stars: 0, versions: 0 },
  };
}
