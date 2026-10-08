// The home page's cities section: the disciplines that build a city, one tab
// per city. Wording is phae's (2026-10-08, the "Every discipline that builds
// the city." design), used as given.
//
// Built from ClawHub's home section src/components/HomeAppsSection.tsx, in
// the place it had on the home page: its heading block, category tabs and
// tile grid, with their classes. Cities other than New York are shown and not
// yet selectable ("More cities soon").
//
// The tiles open the professionals list; which registers each discipline
// covers is the mapping that comes next, built by a tool.

import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, DraftingCompass, HardHat, Landmark, MapPin, Zap, type LucideIcon } from "lucide-react";

type Discipline = { id: string; name: string; description?: string; source: string; icon: LucideIcon };

const CITIES: Array<{ id: string; label: string; live: boolean }> = [
  { id: "new-york", label: "New York", live: true },
  { id: "los-angeles", label: "Los Angeles", live: false },
  { id: "miami", label: "Miami", live: false },
  { id: "austin", label: "Austin", live: false },
  { id: "chicago", label: "Chicago", live: false },
  { id: "san-francisco", label: "San Francisco", live: false },
];

const NEW_YORK: Discipline[] = [
  {
    id: "architects",
    name: "Architects",
    description: "Registered architects filing new builds and adaptive reuse across the boroughs.",
    source: "On record · DOB",
    icon: DraftingCompass,
  },
  {
    id: "developers",
    name: "Developers",
    description: "The owners and sponsors assembling sites and moving deals.",
    source: "On record · ACRIS",
    icon: Landmark,
  },
  {
    id: "general-contractors",
    name: "General Contractors",
    description: "The firms that put the work in place, permit by permit.",
    source: "On record · DOB",
    icon: HardHat,
  },
  {
    id: "structural-engineers",
    name: "Structural Engineers",
    description: "The PEs behind facades, foundations, and FISP cycles.",
    source: "On record · DOB",
    icon: Building2,
  },
  // Its line is cut off in the design; added when phae gives it.
  { id: "electricians", name: "Electricians", source: "On record · DOB", icon: Zap },
];

export function CitySection() {
  return (
    <section className="home-v2-apps oc-section" aria-labelledby="urbicana-cities-title">
      <div className="home-v2-apps-stage">
        <div className="home-v2-apps-workflow-header">
          <div className="home-v2-apps-workflow-copy oc-section-heading">
            <h2 id="urbicana-cities-title" className="oc-section-title">
              Every discipline that builds the city.
            </h2>
            <p className="oc-section-copy">
              The people behind New York's buildings and deals — curated, discipline by discipline,
              each one drawn from the public record.
            </p>
          </div>
        </div>

        <p className="home-v2-section-eyebrow">New York now · More cities soon</p>

        <div className="home-v2-apps-categories" role="tablist" aria-label="Cities">
          {CITIES.map((city) => (
            <button
              key={city.id}
              type="button"
              role="tab"
              aria-selected={city.live}
              disabled={!city.live}
              className="home-v2-apps-category-tab"
            >
              <MapPin className="home-v2-apps-category-tab-icon" size={14} aria-hidden="true" />
              {city.label}
            </button>
          ))}
        </div>

        <div className="home-v2-apps-tile-grid" aria-label="Disciplines in New York">
          {NEW_YORK.map((discipline) => {
            const Icon = discipline.icon;
            return (
              <Link key={discipline.id} to="/publishers" className="home-v2-apps-tile" title={discipline.description}>
                <span className="home-v2-apps-tile-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="home-v2-apps-tile-copy">
                  <span className="home-v2-apps-tile-name">{discipline.name}</span>
                  {discipline.description ? (
                    <span className="home-v2-apps-tile-meta">{discipline.description}</span>
                  ) : null}
                  <span className="home-v2-apps-tile-meta">{discipline.source}</span>
                </span>
                <ArrowRight className="home-v2-apps-tile-arrow" size={14} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
