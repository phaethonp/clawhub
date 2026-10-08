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
  SITE_NAME,
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
import { FILE_RULES } from "./copy";

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
  { name: "name", pattern: new RegExp(`\\b${escape(UPSTREAM_NAME)}\\b`, "g"), to: SITE_NAME },
  { name: "host", pattern: new RegExp(`\\b${escape(UPSTREAM_HOST)}\\b`, "g"), to: SITE_HOST },
];

// Upstream source the rules apply to: the app under src/, not its tests.
export function isRenamedSource(path: string) {
  const p = path.replace(/\\/g, "/");
  // CSS takes only its file rules (copy.ts), not the global renames. The
  // server's share-image code (server/og/) is renamed like src/.
  if (!/\/src\/.+\.(ts|tsx|css)$/.test(p) && !/\/server\/og\/[^/]+\.ts$/.test(p)) return false;
  if (p.includes("/node_modules/") || p.includes("/urbicana/")) return false;
  if (/\.test\.(ts|tsx)$/.test(p) || p.includes("/__tests__/") || /\/-[^/]*test[^/]*$/.test(p)) {
    return false;
  }
  return !p.endsWith("routeTree.gen.ts");
}

export type Counts = Record<string, number>;

// path: the file's path (absolute or repo-relative); its page-label rules
// (copy.ts) run first, on upstream's own words, then the global rules.
export function rename(code: string, path = ""): { code: string; counts: Counts } {
  const counts: Counts = {};
  let next = code;
  const normalized = path.replace(/\\/g, "/");
  const fileRules = FILE_RULES.filter((rule) => normalized === rule.file || normalized.endsWith(`/${rule.file}`));
  const globalRules = /\.css$/.test(normalized) ? [] : RULES;
  for (const rule of [...fileRules, ...globalRules]) {
    let hits = 0;
    next = next.replace(rule.pattern, (...match) => {
      hits += 1;
      // A rule's `to` may refer to its groups ($1, $2).
      return rule.to.replace(/\$(\d)/g, (_, n) => String(match[Number(n)] ?? ""));
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
  for (const file of [...walk(join(root, "src"), []), ...walk(join(root, "server", "og"), [])].sort()) {
    if (!isRenamedSource(file)) continue;
    const { counts } = rename(readFileSync(file, "utf8"), relative(root, file));
    if (Object.keys(counts).length) result[relative(root, file)] = counts;
  }
  return result;
}
