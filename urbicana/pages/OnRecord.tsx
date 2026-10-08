// On Record (phae, 2026-10-09): the people and businesses the city's records
// name who have not claimed a profile, listed per register (the directories Server B's
// entity_spine_declarations records). The grouping into disciplines (phae,
// 2026-10-08: "first create the screen using the registers then we will
// create a mapping") comes later; for now each register is one category.
//
// Built only from ClawHub's catalogue screen (src/routes/skills/index.tsx):
// its page header, BrowseControls with BrowseSearchInput and
// BrowseCategorySelect, BrowseCategorySidebar beside the results, publisher
// rows (PublisherListItem), its results skeleton, "Load more" button and
// SignInPrompt. No class or component of Urbicana's own.
//
// Data (Rails, signed in):
//   GET /api/v1/server_b/registry/directories   the registers
//   GET /api/v1/server_b/registry?source=&q=&page=&page_size=
//     the people in one register; q (name) applies to the default register,
//     all_states_licensed_professionals, only.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BrowseCategorySelect, BrowseCategorySidebar, BrowseControls, BrowseSearchInput } from "../../src/components/BrowseControls";
import { PublisherListItem } from "../../src/components/PublisherListItem";
import { SignInPrompt } from "../../src/components/SignInPrompt";
import { BrowseResultsSkeleton } from "../../src/components/skeletons/BrowseResultsSkeleton";
import { Button } from "../../src/components/ui/button";
import type { BrowseCategory } from "../../src/lib/categories";
import type { PublicPublisherListItem } from "../../src/lib/publicUser";
import { SITE_NAME } from "../brand";
import { rails } from "../data/rails";
import { session } from "../data/session";

const DEFAULT_REGISTER = "all_states_licensed_professionals";
const PAGE_SIZE = 50;

type Directory = { source: string; register_table: string | null; key_column: string | null };
type RegistryRow = {
  entity_id: number | string;
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
    handle: `entity-${row.entity_id}`,
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

  const source = register ?? DEFAULT_REGISTER;
  const searchable = source === DEFAULT_REGISTER;

  useEffect(() => {
    if (!signedIn) return;
    rails<{ directories: Directory[] }>("/server_b/registry/directories")
      .then((response) => setDirectories(response.directories))
      .catch(() => setDirectories([]));
  }, [signedIn]);

  const load = useCallback(
    (nextPage: number) => {
      const id = ++request.current;
      setLoading(true);
      setFailed(false);
      rails<RegistryPage>("/server_b/registry", {
        query: {
          source,
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
    [source, searchable, submitted],
  );

  useEffect(() => {
    if (signedIn) load(1);
  }, [signedIn, load]);

  const categories: BrowseCategory[] = useMemo(
    () =>
      (directories ?? []).map((directory) => ({
        slug: directory.source,
        label: registerLabel(directory.source),
        icon: "database",
      })),
    [directories],
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
          placeholder={searchable ? "Search by name..." : "Search covers the default register only"}
          disabled={!searchable}
        />
        <BrowseCategorySelect categories={categories} value={register} onChange={setRegister} responsive />
      </BrowseControls>
      <div className="browse-layout browse-layout-with-sidebar">
        <BrowseCategorySidebar ariaLabel="Registers" categories={categories} value={register} onChange={setRegister} />
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
