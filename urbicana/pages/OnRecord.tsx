// On Record (phae, 2026-10-09): the people and businesses the public record
// names, location first. Two views of the same catalogue:
//
// - /publishers: a state, then one of its cities (the registers' own state
//   and city columns), the roles recorded there, and the people in them.
// - a city plugin (/plugins/<name>): the roles DOB filings record, narrowed
//   by an objective (a DOB job type) to the roles that filed it.
//
// Composed only of ClawHub's pieces, as ClawHub's catalogue routes compose
// them (src/routes/skills/index.tsx, src/routes/official/index.tsx): the
// route's page header; BrowseControls with BrowseSearchInput, ClawHub's
// Select primitive (as src/routes/stars.tsx uses it beside a browse page)
// and BrowseTopicChips; BrowseCategorySidebar with its responsive
// BrowseCategorySelect; PublisherListItem rows; BrowseResultsSkeleton,
// EmptyState, Button and SignInPrompt. Every option, label and count comes
// from Rails.
//
// Data (Rails, signed in):
//   GET /api/v1/server_b/registry/locations[?state=]   states; a state's cities
//   GET /api/v1/server_b/registry/roles?state=&city=   the roles in a place
//   GET /api/v1/server_b/registry?state=&city=[&source=&role=]   its people
//   GET /api/v1/server_b/registry/job_types            the objectives
//   GET /api/v1/server_b/registry/license_counts[?job_types[]=]   their roles
//   GET /api/v1/server_b/registry/code_meanings?domain=applicant_professional_title
//   GET /api/v1/server_b/registry?license_types[]=&job_types[]=&q=   their people

import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  BrowseCategorySelect,
  BrowseCategorySidebar,
  BrowseControls,
  BrowseControlsRow,
  BrowseSearchInput,
  BrowseTopicChips,
} from "../../src/components/BrowseControls";
import { EmptyState } from "../../src/components/EmptyState";
import { PublisherListItem } from "../../src/components/PublisherListItem";
import { SignInPrompt } from "../../src/components/SignInPrompt";
import { BrowseResultsSkeleton } from "../../src/components/skeletons/BrowseResultsSkeleton";
import { Button } from "../../src/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../src/components/ui/select";
import type { BrowseCategory } from "../../src/lib/categories";
import type { PublicPublisherListItem } from "../../src/lib/publicUser";
import { SITE_NAME } from "../brand";
import type { CityPlugin } from "../city-plugins";
import { rails } from "../data/rails";
import { session } from "../data/session";

const PAGE_SIZE = 50;

type RegistryRow = {
  entity_id: number | string;
  handle?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  person_name?: string | null;
  business_name?: string | null;
  license_number?: string | null;
  license_type?: string | null;
  license_status?: string | null;
  state?: string | null;
  source_table?: string | null;
};
type RegistryPage = { rows: RegistryRow[]; total?: number | null; searchable?: boolean };
type Place = { state: string; city?: string; total: number };
type Role = { source: string; role: string; label: string; people: number };
type JobType = { code: string; meaning: string; description: string | null };

// The registers write some labels in capitals; labels are sentence case
// (openclaw-brand). Mixed-case labels and short codes (RA, PE) are shown as
// written.
function sentenceCase(raw: string) {
  return raw.length > 3 && raw === raw.toUpperCase()
    ? raw.charAt(0) + raw.slice(1).toLowerCase()
    : raw;
}

function toPublisher(
  row: RegistryRow,
  roleLabel: (row: RegistryRow) => string | undefined,
): PublicPublisherListItem {
  // The professionals register returns the parts of a name and no person_name.
  const parts = [row.first_name, row.middle_name, row.last_name]
    .map((part) => part?.trim())
    .filter(Boolean);
  const person = row.person_name?.trim() || (parts.length ? parts.join(" ") : undefined);
  const business = row.business_name?.trim();
  const name = person || business || `Record ${row.entity_id}`;
  const status = row.license_status ? sentenceCase(row.license_status) : undefined;
  return {
    _id: `entity:${row.entity_id}` as PublicPublisherListItem["_id"],
    _creationTime: 0,
    kind: person ? "user" : "org",
    // The record's slug from Rails: the claiming member's profile slug, or
    // the record's own all_entities.slug. TEMPORARY: all_entities.slug is
    // empty for every record (measured 2026-10-09), and ClawHub's row hides a
    // record without a handle; until slugs are minted on Server B, the handle
    // is the identifier the register issued (licence or registration number).
    handle: row.handle ?? row.license_number ?? "",
    displayName: name,
    image: undefined,
    bio: [roleLabel(row), status, row.state].filter(Boolean).join(" · ") || undefined,
    stats: { skills: 0, packages: 0, installs: 0, downloads: 0, stars: 0 },
    publishedItems: [],
  } as unknown as PublicPublisherListItem;
}

// One page of people, and the next on request.
function usePeople(
  path: string,
  query: Record<string, string | number | undefined>,
  enabled: boolean,
) {
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [searchable, setSearchable] = useState(false);
  const request = useRef(0);
  const key = JSON.stringify(query);

  const load = useCallback(
    (nextPage: number) => {
      const id = ++request.current;
      setLoading(true);
      setFailed(false);
      rails<RegistryPage>(path, {
        query: { ...JSON.parse(key), page: nextPage, page_size: PAGE_SIZE },
      })
        .then((response) => {
          if (id !== request.current) return;
          setRows((current) => (nextPage === 1 ? response.rows : [...current, ...response.rows]));
          if (nextPage === 1 || typeof response.total === "number")
            setTotal(response.total ?? null);
          setPage(nextPage);
          setSearchable(Boolean(response.searchable));
        })
        .catch(() => id === request.current && setFailed(true))
        .finally(() => id === request.current && setLoading(false));
    },
    [path, key],
  );

  useEffect(() => {
    if (!enabled) return;
    setRows([]);
    setTotal(null);
    load(1);
  }, [enabled, load]);

  const canLoadMore = total !== null ? rows.length < total : rows.length === page * PAGE_SIZE;
  return { rows, total, loading, failed, searchable, canLoadMore, loadMore: () => load(page + 1) };
}

function useSignedIn() {
  return useSyncExternalStore(session.subscribe, session.isSignedIn, () => false);
}

function Results({
  people,
  roleLabel,
}: {
  people: ReturnType<typeof usePeople>;
  roleLabel: (row: RegistryRow) => string | undefined;
}) {
  const { rows, loading, failed, canLoadMore, loadMore } = people;
  return (
    <div className="browse-results">
      {failed ? (
        <EmptyState title="The records couldn't be loaded" description="Try again in a moment." />
      ) : rows.length === 0 && loading ? (
        <BrowseResultsSkeleton label="Record" showIcon variant="list" />
      ) : rows.length === 0 ? (
        <EmptyState title="No one found" />
      ) : (
        <div className="browse-list-stack">
          <div className="publisher-directory-list">
            {rows.map((row) => (
              <PublisherListItem
                key={`${row.source_table ?? ""}:${row.entity_id}`}
                publisher={toPublisher(row, roleLabel)}
                variant="list"
                showOfficialBadge={false}
                showPublishedRail={false}
              />
            ))}
          </div>
        </div>
      )}
      {rows.length > 0 && canLoadMore ? (
        // ClawHub's "Load more", as src/routes/official/index.tsx places it.
        <div className="card mt-4 flex justify-center">
          <Button type="button" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PageHeader({
  title,
  count,
  description,
}: {
  title: string;
  count: number | null;
  description?: string;
}) {
  // The catalogue route's header (src/routes/skills/index.tsx), with the
  // description line of src/routes/official/index.tsx.
  return (
    <div className="browse-page-header">
      <div className="browse-page-header-main">
        <h1 className="browse-title">
          {title}
          {count !== null ? (
            <>
              {" "}
              <span className="browse-count">{count.toLocaleString()}</span>
            </>
          ) : null}
        </h1>
        {description ? <p className="official-page-description">{description}</p> : null}
      </div>
    </div>
  );
}

function SignedOut() {
  return (
    <main className="browse-page browse-page-borderless-header">
      {/* ClawHub's sign-in card, as on every signed-in page; not restyled per page. */}
      <SignInPrompt title={`Sign in to ${SITE_NAME}`} />
    </main>
  );
}

// /publishers: location first.
export function OnRecordPage() {
  const signedIn = useSignedIn();
  const [states, setStates] = useState<Place[] | null>(null);
  const [state, setState] = useState<string | undefined>(undefined);
  const [cities, setCities] = useState<Place[]>([]);
  // '' is the state as a whole.
  const [city, setCity] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [role, setRole] = useState<string | undefined>(undefined);

  // The states, most people on record first; the page opens on the first.
  useEffect(() => {
    if (!signedIn) return;
    rails<{ states: Place[] }>("/server_b/registry/locations", { query: { limit: 1 } })
      .then((response) => {
        setStates(response.states);
        setState((current) => current ?? response.states[0]?.state);
      })
      .catch(() => setStates([]));
  }, [signedIn]);

  // The chosen state's cities, most people first.
  useEffect(() => {
    if (!signedIn || !state) return;
    setCities([]);
    rails<{ locations: Place[] }>("/server_b/registry/locations", { query: { state, limit: 5000 } })
      .then((response) => setCities(response.locations))
      .catch(() => setCities([]));
  }, [signedIn, state]);

  // The roles recorded in the chosen place.
  useEffect(() => {
    if (!signedIn || !state) return;
    setRoles([]);
    rails<{ roles: Role[] }>("/server_b/registry/roles", {
      query: { state, city: city || undefined },
    })
      .then((response) => setRoles(response.roles))
      .catch(() => setRoles([]));
  }, [signedIn, state, city]);

  const roleKey = (entry: { source: string; role: string }) => `${entry.source}|${entry.role}`;
  const chosen = roles.find((entry) => roleKey(entry) === role);
  const categories: BrowseCategory[] = useMemo(
    () =>
      roles.map((entry) => ({
        slug: roleKey(entry),
        label: sentenceCase(entry.label),
        icon: "database",
      })),
    [roles],
  );
  const labels = useMemo(
    () => new Map(roles.map((entry) => [roleKey(entry), sentenceCase(entry.label)])),
    [roles],
  );
  const roleLabel = useCallback(
    (row: RegistryRow) => labels.get(`${row.source_table ?? ""}|${row.license_type ?? ""}`),
    [labels],
  );

  const people = usePeople(
    "/server_b/registry",
    {
      state,
      city: city || undefined,
      source: chosen?.source,
      role: chosen ? chosen.role : undefined,
    },
    signedIn && Boolean(state),
  );

  if (!signedIn) return <SignedOut />;

  const pickState = (next: string) => {
    setState(next);
    setCity("");
    setRole(undefined);
  };
  const pickCity = (next: string) => {
    setCity(next === state ? "" : next);
    setRole(undefined);
  };

  return (
    <main className="browse-page browse-page-borderless-header skills-browse-page catalog-browse-page">
      <PageHeader title="On Record" count={people.total} />
      <BrowseControls>
        {/* The place: a state, then one of its cities. The first city item
            is the state itself, the whole state. Values as the registers
            record them. */}
        <BrowseControlsRow>
          <Select value={state} onValueChange={pickState} disabled={!states?.length}>
            <SelectTrigger
              size="sm"
              className="w-auto min-w-[88px] gap-1.5 font-semibold"
              aria-label="State"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(states ?? []).map((place) => (
                <SelectItem key={place.state} value={place.state}>
                  {place.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={city || state} onValueChange={pickCity} disabled={!state}>
            <SelectTrigger
              size="sm"
              className="w-auto min-w-[140px] gap-1.5 font-semibold"
              aria-label="City"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state ? <SelectItem value={state}>{state}</SelectItem> : null}
              {cities.map((place) => (
                <SelectItem key={place.city} value={place.city ?? ""}>
                  {place.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BrowseControlsRow>
        <BrowseCategorySelect categories={categories} value={role} onChange={setRole} responsive />
      </BrowseControls>
      <div className="browse-layout browse-layout-with-sidebar">
        <BrowseCategorySidebar
          ariaLabel="Roles"
          categories={categories}
          value={role}
          onChange={setRole}
        />
        <Results people={people} roleLabel={roleLabel} />
      </div>
    </main>
  );
}

// A city plugin: the roles DOB filings record, narrowed by an objective (a DOB
// job type) to the roles that filed it, and their people.
export function CityPluginCatalog({ plugin }: { plugin: CityPlugin }) {
  const signedIn = useSignedIn();
  const [objectives, setObjectives] = useState<JobType[]>([]);
  const [objective, setObjective] = useState<string | undefined>(undefined);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [meanings, setMeanings] = useState<Record<string, { meaning: string }>>({});
  const [role, setRole] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!signedIn) return;
    rails<{ job_types: JobType[] }>("/server_b/registry/job_types")
      .then((response) => setObjectives(response.job_types))
      .catch(() => setObjectives([]));
    rails<Record<string, { meaning: string }>>("/server_b/registry/code_meanings", {
      query: { domain: "applicant_professional_title" },
    })
      .then(setMeanings)
      .catch(() => setMeanings({}));
  }, [signedIn]);

  // The roles that filed the chosen objective; every role DOB records when none is chosen.
  useEffect(() => {
    if (!signedIn) return;
    setCounts({});
    rails<Record<string, number>>("/server_b/registry/license_counts", {
      query: { "job_types[]": objective },
    })
      .then(setCounts)
      .catch(() => setCounts({}));
  }, [signedIn, objective]);

  const categories: BrowseCategory[] = useMemo(
    () =>
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([code]) => ({
          slug: code,
          label: meanings[code]?.meaning ?? code,
          icon: "database",
        })),
    [counts, meanings],
  );
  const roleLabel = useCallback(
    (row: RegistryRow) =>
      row.license_type ? (meanings[row.license_type]?.meaning ?? row.license_type) : undefined,
    [meanings],
  );
  const activeRole = role && role in counts ? role : undefined;

  const people = usePeople(
    "/server_b/registry",
    { "license_types[]": activeRole, "job_types[]": objective, q: submitted || undefined },
    signedIn,
  );

  if (!signedIn) return <SignedOut />;

  const byMeaning = new Map(objectives.map((entry) => [entry.meaning, entry.code]));
  const activeMeaning = objectives.find((entry) => entry.code === objective)?.meaning;

  return (
    <main className="browse-page browse-page-borderless-header skills-browse-page catalog-browse-page">
      <PageHeader title={plugin.title} count={people.total} description={plugin.summary} />
      <BrowseControls>
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
        <BrowseCategorySelect
          categories={categories}
          value={activeRole}
          onChange={setRole}
          responsive
        />
        {/* The objectives: DOB's job types, as DOB names them. */}
        <BrowseTopicChips
          topics={objectives.map((entry) => entry.meaning)}
          activeTopic={activeMeaning}
          onChange={(meaning) => setObjective(meaning ? byMeaning.get(meaning) : undefined)}
          loading={objectives.length === 0}
        />
      </BrowseControls>
      <div className="browse-layout browse-layout-with-sidebar">
        <BrowseCategorySidebar
          ariaLabel="Roles"
          categories={categories}
          value={activeRole}
          onChange={setRole}
        />
        <Results people={people} roleLabel={roleLabel} />
      </div>
    </main>
  );
}
