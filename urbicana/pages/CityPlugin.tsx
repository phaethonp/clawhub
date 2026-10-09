// One city plugin's page, in place of ClawHub's plugin page
// (src/routes/plugins/$name.tsx, its component and loader replaced by
// copy.ts): On Record's catalogue narrowed to the plugin's roles and
// objectives (OnRecord.tsx, CityPluginCatalog). A name that is not a plugin
// gets ClawHub's EmptyState with the plugin page's own "Plugin not found"
// wording.

import { useParams } from "@tanstack/react-router";
import { EmptyState } from "../../src/components/EmptyState";
import { Container } from "../../src/components/layout/Container";
import { findCityPlugin } from "../city-plugins";
import { CityPluginCatalog } from "./OnRecord";

export function CityPluginRoute() {
  const { name } = useParams({ strict: false }) as { name?: string };
  const plugin = name ? findCityPlugin(name) : null;

  if (!plugin) {
    return (
      <main className="py-10">
        <Container size="narrow">
          <EmptyState
            title="Plugin not found"
            description="This plugin does not exist or has been removed."
          />
        </Container>
      </main>
    );
  }

  return <CityPluginCatalog plugin={plugin} />;
}
