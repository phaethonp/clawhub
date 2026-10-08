// The renames applied to upstream's source while it is built. Upstream's
// files on disk are never edited; the build sees Urbicana's words instead.
//
// A rule matches whole words only, so identifiers that contain the name
// (getClawHubSiteUrl, ClawHubSpinner, clawHubDownloads) are left alone, as
// are package names, the `clawhub` CLI command and CLAWHUB_* variables.
//
// rename-manifest.json records how many times each rule matches in each
// file. After an upstream sync, a file whose count changed fails the check
// and is named, so a moved or new "ClawHub" is looked at rather than shipped
// or silently skipped. `bun urbicana/check.ts --update` records the new
// counts once they have been read.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  HOME_HEADLINE,
  HOME_LEDE,
  PRODUCT_NAME,
  SIGN_IN_LABEL,
  SITE_DESCRIPTION,
  SITE_HOST,
  UPSTREAM_DESCRIPTION,
  UPSTREAM_HOME_HEADLINE,
  UPSTREAM_HOME_LEDE,
  UPSTREAM_HOST,
  UPSTREAM_NAME,
  UPSTREAM_SIGN_IN_LABEL,
} from "./brand";

type Rule = { name: string; pattern: RegExp; to: string };

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Order matters: the description contains the name, so it goes first.
export const RULES: Rule[] = [
  { name: "description", pattern: new RegExp(escape(UPSTREAM_DESCRIPTION), "g"), to: SITE_DESCRIPTION },
  { name: "home-headline", pattern: new RegExp(escape(UPSTREAM_HOME_HEADLINE), "g"), to: HOME_HEADLINE },
  { name: "home-lede", pattern: new RegExp(escape(UPSTREAM_HOME_LEDE), "g"), to: HOME_LEDE },
  { name: "sign-in", pattern: new RegExp(escape(UPSTREAM_SIGN_IN_LABEL), "g"), to: SIGN_IN_LABEL },
  { name: "name", pattern: new RegExp(`\\b${escape(UPSTREAM_NAME)}\\b`, "g"), to: PRODUCT_NAME },
  { name: "host", pattern: new RegExp(`\\b${escape(UPSTREAM_HOST)}\\b`, "g"), to: SITE_HOST },
];

// Upstream source the rules apply to: the app under src/, not its tests.
export function isRenamedSource(path: string) {
  const p = path.replace(/\\/g, "/");
  if (!/\/src\/.+\.(ts|tsx)$/.test(p)) return false;
  if (p.includes("/node_modules/") || p.includes("/urbicana/")) return false;
  if (/\.test\.(ts|tsx)$/.test(p) || p.includes("/__tests__/") || /\/-[^/]*test[^/]*$/.test(p)) {
    return false;
  }
  return !p.endsWith("routeTree.gen.ts");
}

export type Counts = Record<string, number>;

export function rename(code: string): { code: string; counts: Counts } {
  const counts: Counts = {};
  let next = code;
  for (const rule of RULES) {
    let hits = 0;
    next = next.replace(rule.pattern, () => {
      hits += 1;
      return rule.to;
    });
    if (hits) counts[rule.name] = hits;
  }
  return { code: next, counts };
}

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Counts per file across upstream's source, as the manifest records them.
export function scan(root: string): Record<string, Counts> {
  const result: Record<string, Counts> = {};
  for (const file of walk(join(root, "src"), []).sort()) {
    if (!isRenamedSource(file)) continue;
    const { counts } = rename(readFileSync(file, "utf8"));
    if (Object.keys(counts).length) result[relative(root, file)] = counts;
  }
  return result;
}
