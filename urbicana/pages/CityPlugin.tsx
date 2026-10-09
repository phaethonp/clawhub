// One city plugin's page, in place of ClawHub's plugin page
// (src/routes/plugins/$name.tsx, its component and loader replaced by
// copy.ts). Built from that page's pieces: its main section, DetailPageShell
// and DetailHero with the breadcrumbs, title and summary line; below, the
// city tabs and discipline tiles of ClawHub's home apps section
// (CityTiles.tsx). A name that is not a plugin gets the page's own
// "Plugin not found" state.

import { useParams } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { DetailBody, DetailHero, DetailPageShell } from "../../src/components/DetailPageShell";
import { EmptyState } from "../../src/components/EmptyState";
import { Container } from "../../src/components/layout/Container";
import { findCityPlugin } from "../city-plugins";
import { rails } from "../data/rails";
import { CityTabs, TileGrid } from "./CityTiles";

export function CityPluginRoute() {
  const { name } = useParams({ strict: false }) as { name?: string };
  const plugin = name ? findCityPlugin(name) : null;
  const [city, setCity] = useState("new-york");
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

  const tiles = plugin.cities.includes(city)
    ? roles.map(([role, people]) => ({
        key: role,
        name: meanings[role]?.meaning ?? role,
        lines: [people.toLocaleString()],
        title: meanings[role]?.description ?? undefined,
        to: "/publishers",
        icon: Users,
      }))
    : [];
  // DOB writes licence types in capitals; labels are sentence case
  // (openclaw-brand).
  const sentenceCase = (raw: string) => raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const contractorTiles = plugin.cities.includes(city)
    ? contractors.map((entry) => ({
        key: entry.label,
        name: sentenceCase(entry.label),
        lines: [entry.count.toLocaleString()],
        to: "/publishers",
        icon: Users,
      }))
    : [];

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
          <TileGrid label="Disciplines" tiles={tiles} />
          {contractorTiles.length ? (
            <>
              <h2 className="oc-section-title">Contractors</h2>
              <TileGrid label="Contractors" tiles={contractorTiles} />
            </>
          ) : null}
        </DetailBody>
      </DetailPageShell>
    </main>
  );
}
