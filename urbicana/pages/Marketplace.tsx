// One marketplace's page, in place of ClawHub's plugin page
// (src/routes/plugins/$name.tsx, its component and loader replaced by
// copy.ts). Built from that page's pieces: its main section, DetailPageShell
// and DetailHero with the breadcrumbs, title and summary line; below, the
// city tabs and discipline tiles of ClawHub's home apps section
// (CityTiles.tsx). A name that is not a marketplace gets the page's own
// "Plugin not found" state.

import { useParams } from "@tanstack/react-router";
import { Building2, DraftingCompass, HardHat, Landmark, Users, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { DetailBody, DetailHero, DetailPageShell } from "../../src/components/DetailPageShell";
import { EmptyState } from "../../src/components/EmptyState";
import { Container } from "../../src/components/layout/Container";
import { findMarketplace } from "../marketplaces";
import { CityTabs, TileGrid } from "./CityTiles";

const DISCIPLINE_ICONS: Record<string, LucideIcon> = {
  architects: DraftingCompass,
  developers: Landmark,
  "general-contractors": HardHat,
  "structural-engineers": Building2,
  electricians: Zap,
};

export function MarketplaceRoute() {
  const { name } = useParams({ strict: false }) as { name?: string };
  const marketplace = name ? findMarketplace(name) : null;
  const [city, setCity] = useState("new-york");

  if (!marketplace) {
    return (
      <main className="py-10">
        <Container size="narrow">
          <EmptyState title="Plugin not found" description="This plugin does not exist or has been removed." />
        </Container>
      </main>
    );
  }

  const tiles = (marketplace.disciplines[city] ?? []).map((discipline) => ({
    key: discipline.id,
    name: discipline.name,
    lines: [discipline.description, discipline.source].filter((line): line is string => Boolean(line)),
    title: discipline.description,
    to: "/publishers",
    icon: DISCIPLINE_ICONS[discipline.id] ?? Users,
  }));

  return (
    <main className="section detail-page-section plugin-detail-page">
      <DetailPageShell>
        <DetailHero
          main={
            <div className="skill-hero-title">
              <nav className="skill-hero-breadcrumbs" aria-label="Plugin breadcrumbs">
                <a href="/plugins">plugins</a>
                <span aria-hidden="true">/</span>
                <a href={`/plugins/${marketplace.name}`} aria-current="page">
                  {marketplace.name}
                </a>
              </nav>
              <div className="skill-hero-heading-stack">
                <div className="skill-hero-title-row">
                  <h1 className="skill-page-title">{marketplace.title}</h1>
                </div>
              </div>
              <div className="skill-summary-block">
                <p className="section-subtitle skill-summary-line">{marketplace.summary}</p>
              </div>
            </div>
          }
        />
        <DetailBody>
          <p className="home-v2-section-eyebrow">{marketplace.eyebrow}</p>
          <CityTabs value={city} onChange={setCity} />
          <TileGrid label="Disciplines" tiles={tiles} />
        </DetailBody>
      </DetailPageShell>
    </main>
  );
}
