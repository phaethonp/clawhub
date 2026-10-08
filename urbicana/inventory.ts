// Page inventory: for every route file under src/routes, the backend calls
// (api.<module>.<function>) reachable through its imports inside src/.
//   bun urbicana/inventory.ts > urbicana/inventory.json
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const exts = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function walk(d: string, out: string[] = []) {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else out.push(f);
  }
  return out;
}
function resolveImport(from: string, spec: string) {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(from), spec);
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const x of exts) if (existsSync(base + x)) return base + x;
  return null;
}
const cache = new Map<string, { calls: Set<string>; deps: string[] }>();
function read(file: string) {
  if (cache.has(file)) return cache.get(file)!;
  const code = readFileSync(file, "utf8");
  const calls = new Set(code.match(/\bapi\.[A-Za-z]+\.[A-Za-z]+/g) ?? []);
  const deps: string[] = [];
  for (const m of code.matchAll(/(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
    const r = resolveImport(file, m[1] ?? m[2]);
    if (r && r.startsWith(src) && !/\.test\.|__tests__/.test(r)) deps.push(r);
  }
  const v = { calls, deps };
  cache.set(file, v);
  return v;
}
function reach(file: string) {
  const seen = new Set<string>();
  const calls = new Set<string>();
  const stack = [file];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const { calls: c, deps } = read(f);
    c.forEach((x) => calls.add(x.replace(/^api\./, "")));
    // Do not follow into other routes or the shared root/layout twice.
    for (const d of deps) if (!d.includes("/routes/") || d === file) stack.push(d);
  }
  return [...calls].sort();
}
const routes = walk(join(src, "routes"))
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.|__tests__/.test(f))
  .filter((f) => !/\/-[^/]+\.tsx?$/.test(f) || /\/-management\//.test(f) === false);
const out: Record<string, string[]> = {};
for (const r of routes.sort()) {
  const rel = relative(join(src, "routes"), r);
  if (/^-|\/-/.test(rel)) continue; // route-local helpers, not pages
  out[rel] = reach(r);
}
console.log(JSON.stringify(out, null, 2));
