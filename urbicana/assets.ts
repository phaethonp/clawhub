// Urbicana's images are served at the same paths as upstream's, so no
// upstream file has to change to point at them. A file in urbicana/public/
// replaces the upstream file of the same path under public/.
//
// The check fails when upstream adds a public file that is neither replaced
// here nor listed below as not being ClawHub's brand, and when a replacement
// no longer has an upstream file to replace (upstream renamed or removed it,
// so the reference moved and the replacement serves nothing).

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Upstream public files that are not ClawHub's identity: third-party marks
// shown beside their names, crawler and API files.
export const NOT_BRAND = [
  /^robots\.txt$/,
  /^openai-favicon\.svg$/,
  /^slack-favicon\.svg$/,
  /^tanstack-/,
  /^app-icons\//,
  /^api\//,
];

// Upstream public files this site does not serve at all: they announce
// ClawHub's registry, CLI endpoints and security contact, none of which
// hub.urbicana.com offers yet. Dev answers 404; the build deletes them.
export const NOT_SERVED = [
  ".well-known/clawhub.json",
  ".well-known/clawdhub.json",
  ".well-known/openclaw-registry.json",
  ".well-known/security.txt", // until Urbicana has a security contact
  // ClawHub's summary for AI crawlers, generated from its docs at every start
  // (scripts/generate-llms-txt.ts): it describes ClawHub and links
  // docs.openclaw.ai. Not served until Urbicana has its own (phae, 2026-10-08).
  "llms.txt",
];

function walk(dir: string, root: string, out: string[]) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, root, out);
    else out.push(relative(root, full).replace(/\\/g, "/"));
  }
  return out;
}

export function replacements(root: string) {
  const dir = join(root, "urbicana", "public");
  return walk(dir, dir, []).sort();
}

export function checkAssets(root: string): string[] {
  const problems: string[] = [];
  const upstream = walk(join(root, "public"), join(root, "public"), []);
  const ours = new Set(replacements(root));
  for (const file of upstream) {
    if (ours.has(file) || NOT_SERVED.includes(file)) continue;
    if (NOT_BRAND.some((rule) => rule.test(file))) continue;
    problems.push(`public/${file}: upstream file with no Urbicana replacement and not listed as non-brand`);
  }
  const upstreamSet = new Set(upstream);
  for (const file of NOT_SERVED) {
    if (!upstreamSet.has(file)) problems.push(`NOT_SERVED lists ${file}, upstream has no public/${file}`);
  }
  for (const file of ours) {
    if (!upstreamSet.has(file)) {
      problems.push(`urbicana/public/${file}: replaces nothing, upstream has no public/${file}`);
    }
  }
  return problems;
}
