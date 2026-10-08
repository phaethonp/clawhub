// The home page banner: "Plug into your city". Built from ClawHub's home
// section src/components/HomeAppsSection.tsx ("Skills for the apps you
// already use"), in the place it had: its heading block, tabs (the cities)
// and tiles (the city plugins in the chosen city, each opening its plugin
// page).

import { useState } from "react";
import { Store } from "lucide-react";
import { PLUG_INTO_YOUR_CITY, cityPluginsIn } from "../city-plugins";
import { CityTabs, TileGrid } from "./CityTiles";

export function CitySection() {
  const [city, setCity] = useState("new-york");
  const tiles = cityPluginsIn(city).map((plugin) => ({
    key: plugin.name,
    name: plugin.title,
    lines: [plugin.summary],
    title: plugin.summary,
    to: `/plugins/${plugin.name}`,
    icon: Store,
  }));

  return (
    <section className="home-v2-apps oc-section" aria-labelledby="urbicana-cities-title">
      <div className="home-v2-apps-stage">
        <div className="home-v2-apps-workflow-header">
          <div className="home-v2-apps-workflow-copy oc-section-heading">
            <h2 id="urbicana-cities-title" className="oc-section-title">
              {PLUG_INTO_YOUR_CITY.title}
            </h2>
            <p className="oc-section-copy">{PLUG_INTO_YOUR_CITY.line}</p>
          </div>
        </div>
        <CityTabs value={city} onChange={setCity} />
        <TileGrid label="Plugins" tiles={tiles} />
      </div>
    </section>
  );
}
