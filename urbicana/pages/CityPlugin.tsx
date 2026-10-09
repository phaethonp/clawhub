// One city plugin's page, in place of ClawHub's plugin page
// (src/routes/plugins/$name.tsx, its component and loader replaced by
// copy.ts). Built from that page's pieces: its main section, DetailPageShell
// and DetailHero with the breadcrumbs, title and summary line; below, the
// city tabs of ClawHub's home apps section; the directories and their roles
// as ClawHub's publisher profile tab bar and label-and-count chips
// (CityTiles.tsx). A name that is not a plugin gets the page's own
// "Plugin not found" state.

import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DetailBody, DetailHero, DetailPageShell } from "../../src/components/DetailPageShell";
import { EmptyState } from "../../src/components/EmptyState";
import { BrowseChipTabs, BrowseControls, BrowseControlsRow, BrowseSegmentedTabs } from "../../src/components/BrowseControls";
import { Container } from "../../src/components/layout/Container";
import { findCityPlugin } from "../city-plugins";
import { rails } from "../data/rails";
import { CityTabs } from "./CityTiles";

export function CityPluginRoute() {
  const { name } = useParams({ strict: false }) as { name?: string };
  const plugin = name ? findCityPlugin(name) : null;
  const [city, setCity] = useState("new-york");
  const [directory, setDirectory] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  // The plugin's disciplines: every role the register records
  // (all_states_licensed_professionals.license_type) with its count of people
  // on record, from GET /server_b/registry/license_counts with no codes.
  const [roles, setRoles] = useState<Array<[string, number]>>([]);
  // What each role code means, as DOB defines it (dob_code_meanings, domain
  // applicant_professional_title). A code DOB does not define has no entry
  // and shows as recorded.
  const [contractors, setContractors] = useState<Array<{ label: string; count: number }>>([]);
  const [meanings, setMeanings] = useState<Record<string, { meaning: string; description: string | null }>>({});
  useEffect(() => {
    if (!plugin) return;
    let cancelled = false;
    rails<Record<string, number>>("/server_b/registry/license_counts")
      .then((counts) => {
        if (!cancelled) setRoles(Object.entries(counts).sort((a, b) => b[1] - a[1]));
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      });
    // The contractors: each licence type of the DOB licence roll
    // (contractor_licenses_nyc) with its count of active licences, from the
    // existing GET /server_b/registry/contractor_licenses.
    rails<{ contractor_licenses: Array<{ label: string; count: number }> }>("/server_b/registry/contractor_licenses")
      .then((found) => {
        if (!cancelled) setContractors([...found.contractor_licenses].sort((a, b) => b.count - a.count));
      })
      .catch(() => {
        if (!cancelled) setContractors([]);
      });
    rails<Record<string, { meaning: string; description: string | null }>>("/server_b/registry/code_meanings", {
      query: { domain: "applicant_professional_title" },
    })
      .then((found) => {
        if (!cancelled) setMeanings(found);
      })
      .catch(() => {
        if (!cancelled) setMeanings({});
      });
    return () => {
      cancelled = true;
    };
  }, [plugin]);

  if (!plugin) {
    return (
      <main className="py-10">
        <Container size="narrow">
          <EmptyState title="Plugin not found" description="This plugin does not exist or has been removed." />
        </Container>
      </main>
    );
  }

  // DOB writes licence types in capitals; labels are sentence case
  // (openclaw-brand).
  const sentenceCase = (raw: string) => raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  // A directory is named by its register's declared name
  // (entity_spine_declarations.source), spaced, as /registry-v3 names
  // directories.
  const directoryLabel = (source: string) => sentenceCase(source.replace(/_/g, " "));
  // Each directory with the roles it records and their counts.
  const directories = plugin.cities.includes(city)
    ? [
        {
          source: "all_states_licensed_professionals",
          roles: roles.map(([code, count]) => ({ value: code, label: meanings[code]?.meaning ?? code, count })),
        },
        {
          source: "contractor_licenses_nyc",
          roles: contractors.map((entry) => ({ value: entry.label, label: sentenceCase(entry.label), count: entry.count })),
        },
      ].filter((entry) => entry.roles.length)
    : [];
  const shown = directories.find((entry) => entry.source === directory) ?? directories[0];

  return (
    <main className="section detail-page-section plugin-detail-page">
      <DetailPageShell>
        <DetailHero
          main={
            <div className="skill-hero-title">
              <nav className="skill-hero-breadcrumbs" aria-label="Plugin breadcrumbs">
                <a href="/plugins">plugins</a>
                <span aria-hidden="true">/</span>
                <a href={`/plugins/${plugin.name}`} aria-current="page">
                  {plugin.name}
                </a>
              </nav>
              <div className="skill-hero-heading-stack">
                <div className="skill-hero-title-row">
                  <h1 className="skill-page-title">{plugin.title}</h1>
                </div>
              </div>
              <div className="skill-summary-block">
                <p className="section-subtitle skill-summary-line">{plugin.summary}</p>
              </div>
            </div>
          }
        />
        <DetailBody>
          <p className="home-v2-section-eyebrow">{plugin.eyebrow}</p>
          <CityTabs value={city} onChange={setCity} />
          {/* The directories as ClawHub's publisher profile shows its catalog
              groups (src/routes/user/$handle.tsx: publisher-profile-tab-bar,
              BrowseSegmentedTabs with a count per group); the chosen
              directory's roles as ClawHub's label-and-count chips. */}
          {shown ? (
            <div className="publisher-profile-tab-bar">
              <BrowseControls>
                <BrowseControlsRow>
                  <BrowseSegmentedTabs
                    ariaLabel="Directories"
                    options={directories.map((entry) => ({
                      value: entry.source,
                      label: directoryLabel(entry.source),
                      count: entry.roles.reduce((sum, role) => sum + role.count, 0).toLocaleString(),
                    }))}
                    value={shown.source}
                    onChange={(value) => value && setDirectory(value)}
                  />
                </BrowseControlsRow>
                <BrowseChipTabs
                  ariaLabel={directoryLabel(shown.source)}
                  options={shown.roles.map((role) => ({
                    value: role.value,
                    label: role.label,
                    count: role.count.toLocaleString(),
                  }))}
                  value={undefined}
                  onChange={() => navigate({ to: "/publishers" })}
                />
              </BrowseControls>
            </div>
          ) : null}
        </DetailBody>
      </DetailPageShell>
    </main>
  );
}
