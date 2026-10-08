// The fork's brand check: run after every upstream sync, and by the build.
//
//   bun urbicana/check.ts            fail on any difference
//   bun urbicana/check.ts --update   record the current rename counts
//
// Two things are checked: the rename counts per file against
// rename-manifest.json, and that every upstream public file is either
// replaced by urbicana/public/ or listed as not ClawHub's brand.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAssets } from "./assets";
import { FILE_RULES } from "./copy";
import { scan, type Counts } from "./rename";

const MANIFEST = "urbicana/rename-manifest.json";

export function repoRoot() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function show(counts?: Counts) {
  return counts ? JSON.stringify(counts) : "none";
}

export function checkRenames(root: string): string[] {
  const path = join(root, MANIFEST);
  if (!existsSync(path)) return [`${MANIFEST} is missing; run bun urbicana/check.ts --update`];
  const recorded: Record<string, Counts> = JSON.parse(readFileSync(path, "utf8"));
  const current = scan(root);
  const problems: string[] = [];
  for (const file of new Set([...Object.keys(recorded), ...Object.keys(current)])) {
    const was = show(recorded[file]);
    const now = show(current[file]);
    if (was !== now) problems.push(`${file}: renames recorded ${was}, found ${now}`);
  }
  return problems;
}

// Every page-label rule (copy.ts) must still find its phrase in its file: a
// rule that matches nothing renames nothing, silently.
export function checkFileRules(root: string): string[] {
  const problems: string[] = [];
  for (const rule of FILE_RULES) {
    const path = join(root, rule.file);
    if (!existsSync(path)) {
      problems.push(`${rule.file}: file gone, label rule ${rule.name} has nothing to rename`);
      continue;
    }
    const hits = readFileSync(path, "utf8").match(new RegExp(rule.pattern.source, "g"))?.length ?? 0;
    if (hits === 0) problems.push(`${rule.file}: label rule ${rule.name} matches nothing`);
  }
  return problems;
}

export function checkAll(root: string) {
  return [...checkRenames(root), ...checkFileRules(root), ...checkAssets(root)];
}

if (import.meta.main) {
  const root = repoRoot();
  if (process.argv.includes("--update")) {
    writeFileSync(join(root, MANIFEST), `${JSON.stringify(scan(root), null, 2)}\n`);
    console.log(`recorded ${MANIFEST}`);
  }
  const problems = checkAll(root);
  if (problems.length) {
    console.error(`urbicana brand check: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("urbicana brand check: ok");
}
