# Design audit: city plugin page

- Carapace: v0.6.1 · consumer `phaethonp/clawhub` `urbicana` at `b0061f3e`
- Scope: [`urbicana/pages/CityPlugin.tsx`](../pages/CityPlugin.tsx), [`urbicana/pages/CityTiles.tsx`](../pages/CityTiles.tsx), [`urbicana/city-plugins.ts`](../city-plugins.ts); rendered at `/plugins/city-disciplines`, signed in

## Validation

- Source checks: raw colors, one-off values, raw controls, class names (all ClawHub's), the build rule the page depends on.
- Rendered at 1280×900 and 375×812, light theme: page overflow, clipped text, unnamed controls, colors.
- **Dark theme not verified:** the test browser stayed light under both the system setting and ClawHub's theme setting.

## Result

| Severity | Count |
| --- | --- |
| Error | 0 |
| Warning | 2 |
| Info | 4 |

No errors: no raw colors or one-off values, every control named, no page overflow at either width.

### Warnings

1. **layout/card-overuse** (judgment): [`CityPlugin.tsx:139`](../pages/CityPlugin.tsx#L139). Each directory is a page section drawn as a floating card. Carapace: "Avoid nested decorative cards and page sections styled as floating cards."
2. **layout/overflow** (mechanical): [`CityTiles.tsx:43`](../pages/CityTiles.tsx#L43). At 375px, 8 contractor role names are cut ("Journeyman", "Site safety", "General contractor"…). Carapace: "Keep text within its container at supported viewport sizes."

### Info

3. **component/duplicate** (judgment): [`copy.ts:122`](../copy.ts#L122). Home-route anatomy (tiles, tabs, eyebrow) on the plugin route, working only through a rule that extends the home page's private `--hv2-*` tokens.
4. **copy/clarity** (judgment): [`CityPlugin.tsx:80`](../pages/CityPlugin.tsx#L80). Roles show as codes until PR #376 is deployed.
5. **copy/clarity** (judgment): [`CityPlugin.tsx:93`](../pages/CityPlugin.tsx#L93). "Contractor licenses nyc": acronym lowercased.
6. **layout/overflow** (mechanical, info): [`CityTiles.tsx:11`](../pages/CityTiles.tsx#L11). City tabs row scrolls at 375px (3 of 6 visible), as ClawHub's home tabs do.

All fixes are human review under the fix policy (hierarchy, copy or rendered content); none applied.
