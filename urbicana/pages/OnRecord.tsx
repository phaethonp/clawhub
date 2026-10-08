// On Record (phae, 2026-10-09): the people and businesses the records name who
// have not claimed a profile. Location comes first (phae: "first on the
// hierarchy is the location everything is downstream to that"; "state/city"):
// a state, then one of its cities, from the registers' own values (stored
// counts, recounted nightly). The page opens on the state with the most people,
// the sidebar lists the registers with people there, and the rows are that
// register's people in that place. "All states" lists every register.
// Professions as filters come with the registers-to-professions mapping.
//
// Built only from ClawHub's catalogue screen (src/routes/skills/index.tsx):
// its page header, BrowseControls with BrowseSearchInput and
// BrowseCategorySelect, BrowseCategorySidebar beside the results, publisher
// rows (PublisherListItem), its results skeleton, "Load more" button and
// SignInPrompt. No class or component of Urbicana's own.
//
// Data (Rails, signed in):
//   GET /api/v1/server_b/registry/locations     the places, with each
//     register's count there
//   GET /api/v1/server_b/registry/directories   the registers
//   GET /api/v1/server_b/registry?source=&city=&state=&q=&page=&page_size=
//     the people in one register (in one place); q (name) applies to the
//     default register, all_states_licensed_professionals, only, which
//     records no city.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  BrowseCategorySelect,
  BrowseCategorySidebar,
  BrowseControls,
  BrowseControlsRow,
  BrowseSearchInput,
} from "../../src/components/BrowseControls";
import { PublisherListItem } from "../../src/components/PublisherListItem";
import { SignInPrompt } from "../../src/components/SignInPrompt";
import { BrowseResultsSkeleton } from "../../src/components/skeletons/BrowseResultsSkeleton";
import { Button } from "../../src/components/ui/button";
import type { BrowseCategory } from "../../src/lib/categories";
import type { PublicPublisherListItem } from "../../src/lib/publicUser";
import { SITE_NAME } from "../brand";
import { rails } from "../data/rails";
import { session } from "../data/session";

// The registers record a state as its postal code; the picker shows the
// name (design-audit copy/clarity: a bare code is vague). Codes not listed
// (provinces, foreign entries) show as recorded.
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  PR: "Puerto Rico", GU: "Guam", VI: "U.S. Virgin Islands",
};
const stateName = (code: string) => STATE_NAMES[code] ?? code;

const DEFAULT_REGISTER = "all_states_licensed_professionals";
const PAGE_SIZE = 50;

type Directory = { source: string; register_table: string | null; key_column: string | null };
type RegistryRow = {
  entity_id: number | string;
  handle?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  person_name?: string | null;
  business_name?: string | null;
  license_type?: string | null;
  license_status?: string | null;
  state?: string | null;
};
type RegistryPage = { rows: RegistryRow[]; total?: number | null };
type Count = { source: string; count: number };
type StatePlace = { state: string; total: number; sources: Count[] };
type Place = { city: string; state: string; total: number; sources: Count[] };

// ClawHub's category select with the labels prop copy.ts adds at build time
// (the type check reads upstream's source, which does not have it yet).
const LocationSelect = BrowseCategorySelect as unknown as (
  props: Parameters<typeof BrowseCategorySelect>[0] & { labels: { all: string; search: string; name: string } },
) => ReturnType<typeof BrowseCategorySelect>;

// A register's table name as words ("nys_real_estate_licenses" -> "NYS real
// estate licenses"); the discipline names replace these with the mapping.
function registerLabel(source: string) {
  const words = source.split("_").map((word) => (/^(nys|nyc|dob|fdic)$/.test(word) ? word.toUpperCase() : word));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toPublisher(row: RegistryRow): PublicPublisherListItem {
  // The default register returns the parts of a name and no person_name.
  const parts = [row.first_name, row.middle_name, row.last_name].map((part) => part?.trim()).filter(Boolean);
  const person = row.person_name?.trim() || (parts.length ? parts.join(" ") : undefined);
  const business = row.business_name?.trim();
  const name = person || business || `Record ${row.entity_id}`;
  return {
    _id: `entity:${row.entity_id}` as PublicPublisherListItem["_id"],
    _creationTime: 0,
    kind: person ? "user" : "org",
    // The record's slug from Rails: the claiming member's profile slug, or
    // the record's own all_entities.slug.
    handle: row.handle ?? "",
    displayName: name,
    image: undefined,
    bio: [row.license_type, row.license_status, row.state].filter(Boolean).join(" · ") || undefined,
    stats: { skills: 0, packages: 0, installs: 0, downloads: 0, stars: 0 },
    publishedItems: [],
  } as unknown as PublicPublisherListItem;
}

export function OnRecordPage() {
  const signedIn = useSyncExternalStore(session.subscribe, session.isSignedIn, () => false);
  const [directories, setDirectories] = useState<Directory[] | null>(null);
  const [states, setStates] = useState<StatePlace[] | null>(null);
  const [stateCode, setStateCode] = useState<string | undefined>(undefined);
  const [cities, setCities] = useState<Place[]>([]);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [register, setRegister] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);

  // Location first: a state, then (optionally) one of its cities; the
  // registers listed are the ones with people there, most first.
  const stateEntry = useMemo(() => states?.find((entry) => entry.state === stateCode), [states, stateCode]);
  const cityEntry = useMemo(() => cities.find((entry) => entry.city === city), [cities, city]);
  const placeSources = useMemo(
    () => [...(cityEntry ?? stateEntry)?.sources ?? []].sort((a, b) => b.count - a.count),
    [cityEntry, stateEntry],
  );
  const inPlace = Boolean(stateEntry);
  const source = register ?? placeSources[0]?.source ?? DEFAULT_REGISTER;
  // Name search runs on the default register, which records no city.
  const searchable = source === DEFAULT_REGISTER && !cityEntry;

  useEffect(() => {
    if (!signedIn) return;
    rails<{ directories: Directory[] }>("/server_b/registry/directories")
      .then((response) => setDirectories(response.directories))
      .catch(() => setDirectories([]));
    // The page opens on the state with the most people on record.
    rails<{ states: StatePlace[] }>("/server_b/registry/locations", { query: { limit: 1 } })
      .then((response) => {
        setStates(response.states);
        setStateCode((current) => current ?? response.states[0]?.state);
      })
      .catch(() => setStates([]));
  }, [signedIn]);

  // The chosen state's cities.
  useEffect(() => {
    setCities([]);
    if (!signedIn || !stateCode) return;
    let cancelled = false;
    rails<{ locations: Place[] }>("/server_b/registry/locations", { query: { state: stateCode, limit: 5000 } })
      .then((response) => !cancelled && setCities(response.locations))
      .catch(() => !cancelled && setCities([]));
    return () => {
      cancelled = true;
    };
  }, [signedIn, stateCode]);

  const chooseState = (next: string | undefined) => {
    setStateCode(next);
    setCity(undefined);
    setRegister(undefined);
  };
  const chooseCity = (next: string | undefined) => {
    setCity(next);
    setRegister(undefined);
  };

  const load = useCallback(
    (nextPage: number) => {
      const id = ++request.current;
      setLoading(true);
      setFailed(false);
      rails<RegistryPage>("/server_b/registry", {
        query: {
          source,
          state: stateEntry?.state,
          city: cityEntry?.city,
          q: searchable ? submitted || undefined : undefined,
          page: nextPage,
          page_size: PAGE_SIZE,
        },
      })
        .then((response) => {
          if (id !== request.current) return;
          setRows((current) => (nextPage === 1 ? response.rows : [...current, ...response.rows]));
          if (nextPage === 1 || typeof response.total === "number") setTotal(response.total ?? null);
          setPage(nextPage);
        })
        .catch(() => id === request.current && setFailed(true))
        .finally(() => id === request.current && setLoading(false));
    },
    [source, searchable, submitted, stateEntry, cityEntry],
  );

  useEffect(() => {
    // Wait for the states, so the first list is already in the first state.
    if (signedIn && states !== null) load(1);
  }, [signedIn, states, load]);

  const stateOptions: BrowseCategory[] = useMemo(
    () => (states ?? []).map((entry) => ({ slug: entry.state, label: stateName(entry.state), icon: "globe" })),
    [states],
  );
  const cityOptions: BrowseCategory[] = useMemo(
    () => cities.map((entry) => ({ slug: entry.city, label: entry.city, icon: "globe" })),
    [cities],
  );
  // The registers with people in the chosen place; every register otherwise.
  const categories: BrowseCategory[] = useMemo(
    () =>
      (inPlace ? placeSources.map((entry) => entry.source) : (directories ?? []).map((directory) => directory.source)).map(
        (name) => ({ slug: name, label: registerLabel(name), icon: "database" }),
      ),
    [inPlace, placeSources, directories],
  );

  if (!signedIn) {
    return (
      <main className="browse-page browse-page-borderless-header">
        {/* ClawHub's sign-in card, as on every signed-in page; not restyled per page. */}
        <SignInPrompt title={`Sign in to ${SITE_NAME}`} />
      </main>
    );
  }

  const canLoadMore = total !== null ? rows.length < total : rows.length === page * PAGE_SIZE;

  return (
    <main className="browse-page browse-page-borderless-header skills-browse-page catalog-browse-page">
      <div className="browse-page-header">
        <div className="browse-page-header-main">
          <h1 className="browse-title">
            On Record
            {total !== null ? (
              <>
                {" "}
                <span className="browse-count">{total.toLocaleString()}</span>
              </>
            ) : null}
          </h1>
        </div>
      </div>
      <BrowseControls>
        {searchable ? (
          <BrowseSearchInput
            value={query}
            onChange={setQuery}
            onClear={() => {
              setQuery("");
              setSubmitted("");
            }}
            onSubmit={() => setSubmitted(query.trim())}
            inputRef={searchInputRef}
            label="Search by name"
            placeholder="Search by name..."
          />
        ) : null}
        {/* Filters beside the collection they affect (carapace
            application-surfaces), side by side in ClawHub's controls row. */}
        <BrowseControlsRow>
          <LocationSelect
            categories={stateOptions}
            value={stateCode}
            onChange={chooseState}
            labels={{ all: "All states", search: "Search states…", name: "State" }}
          />
          {stateCode ? (
            <LocationSelect
              categories={cityOptions}
              value={city}
              onChange={chooseCity}
              labels={{ all: "All cities", search: "Search cities…", name: "City" }}
            />
          ) : null}
          <BrowseCategorySelect categories={categories} value={register ?? (inPlace ? source : undefined)} onChange={setRegister} responsive />
        </BrowseControlsRow>
      </BrowseControls>
      <div className="browse-layout browse-layout-with-sidebar">
        <BrowseCategorySidebar
          ariaLabel="Registers"
          categories={categories}
          value={register ?? (inPlace ? source : undefined)}
          onChange={setRegister}
        />
        <div className="browse-results">
          {failed ? (
            <div role="alert" className="empty-state">
              <p className="empty-state-title">The records couldn't be loaded</p>
              <p className="empty-state-body">Try again in a moment.</p>
            </div>
          ) : rows.length === 0 && loading ? (
            <BrowseResultsSkeleton label="Record" showIcon variant="list" />
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No one found</p>
            </div>
          ) : (
            // The publisher list as src/routes/official/index.tsx draws it.
            <div className="browse-list-stack">
              <div className="browse-list-head browse-list-head-publishers" aria-hidden="true">
                <span className="browse-list-head-label">Name</span>
                <span className="browse-list-head-label browse-list-head-stat">Activity</span>
              </div>
              <div className="publisher-directory-list">
                {rows.map((row) => (
                  <PublisherListItem
                    key={String(row.entity_id)}
                    publisher={toPublisher(row)}
                    variant="list"
                    showOfficialBadge={false}
                    showPublishedRail={false}
                  />
                ))}
              </div>
            </div>
          )}
          {rows.length > 0 && canLoadMore ? (
            <div className="card mt-4 flex justify-center">
              <Button type="button" onClick={() => load(page + 1)} disabled={loading}>
                {loading ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
