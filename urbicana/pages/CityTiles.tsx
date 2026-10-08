// The city tabs and tile grid of ClawHub's home apps section
// (src/components/HomeAppsSection.tsx), shared by the home banner and a
// marketplace's page. Same classes; cities not live yet are shown disabled.

import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, type LucideIcon } from "lucide-react";
import { CITIES } from "../marketplaces";

export function CityTabs({ value, onChange }: { value: string; onChange: (cityId: string) => void }) {
  return (
    <div className="home-v2-apps-categories" role="tablist" aria-label="Cities">
      {CITIES.map((city) => (
        <button
          key={city.id}
          type="button"
          role="tab"
          aria-selected={city.id === value}
          disabled={!city.live}
          className="home-v2-apps-category-tab"
          onClick={() => onChange(city.id)}
        >
          <MapPin className="home-v2-apps-category-tab-icon" size={14} aria-hidden="true" />
          {city.label}
        </button>
      ))}
    </div>
  );
}

export type Tile = { key: string; name: string; lines: string[]; title?: string; to: string; icon: LucideIcon };

export function TileGrid({ label, tiles }: { label: string; tiles: Tile[] }) {
  return (
    <div className="home-v2-apps-tile-grid" aria-label={label}>
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link key={tile.key} to={tile.to} className="home-v2-apps-tile" title={tile.title}>
            <span className="home-v2-apps-tile-icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <span className="home-v2-apps-tile-copy">
              <span className="home-v2-apps-tile-name">{tile.name}</span>
              {tile.lines.map((line) => (
                <span key={line} className="home-v2-apps-tile-meta">
                  {line}
                </span>
              ))}
            </span>
            <ArrowRight className="home-v2-apps-tile-arrow" size={14} aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
