# Design audit: On Record

- Carapace: v0.6.1 (`@openclaw/carapace` git tag, lock `3a8bcfb`)
- Consumer: `phaethonp/clawhub` branch `urbicana` at `c7c51176`
- Scope: [`urbicana/pages/OnRecord.tsx`](../pages/OnRecord.tsx), rendered at `/publishers`

## Validation

- Source checks on the page: raw colors, arbitrary values, custom properties,
  raw controls, class names (every class is ClawHub's own), accessible names.
- Rendered `/publishers` signed in, against Rails on :5000: desktop 1280×800 and
  mobile 375×812, light and dark themes; checked page overflow, clipped text,
  unnamed controls, target size, theme contrast.

## Result

| Severity | Count |
| --- | --- |
| Error | 0 |
| Warning | 2 |
| Info | 2 |

No errors: no raw colors or values, no duplicated primitives (the empty,
error, skeleton and "Load more" markup match ClawHub's catalogue pages), every
control has an accessible name, no page overflow at either width, both themes
keep content and contrast.

### Warnings

1. **copy/clarity** (judgment): [`OnRecord.tsx:108`](../pages/OnRecord.tsx#L108).
   Every row's Activity column reads "0 published · 0 downloads", ClawHub's
   publisher stats zero-filled for records. It states nothing true about the
   record. Carapace: master lists carry "identity, status, and one useful
   comparison value". Human review (copy/hierarchy).
2. **layout/overflow** (mechanical): [`OnRecord.tsx:104`](../pages/OnRecord.tsx#L104).
   At 375px every record name is cut ("JADE LEARNING LLC" gets 104px) because
   the row also carries a synthetic handle "@entity-<id>" and the zero stat;
   the licence and status line is hidden. Human review (changes rendered
   content).

### Info

3. **copy/clarity** (judgment): [`OnRecord.tsx:293`](../pages/OnRecord.tsx#L293).
   Registers sit under ClawHub's fixed sidebar heading "Categories".

4. **copy/clarity** (judgment): [`OnRecord.tsx:305`](../pages/OnRecord.tsx#L305).
   Loading header "Record / Downloads" vs loaded header "Name / Activity".
No further non-error findings.
