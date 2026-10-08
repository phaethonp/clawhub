// ClawHub's design-audit scripts (scripts/design-audit/), run over the whole
// fork: every page, and Urbicana's code as well as ClawHub's.
//
// The upstream scripts fix their scope inside: source-check.ts reads only
// src/ and browser-check.ts opens only "/", "/skills" and "/plugins". Upstream
// files are never edited (SYNC.md), so this runner reads each script, applies
// exact replacements to its scope and nothing else, writes the result under
// .generated/ and runs it. Every replacement must match exactly once; when
// upstream changes one of those lines the runner stops and names it, like
// check.ts does for the brand rules.
//
//   bun urbicana/design-audit/run.ts source --output <path> [--base <sha> | --working-tree]
//     source-check over src/ and urbicana/; --base defaults to where the
//     urbicana branch left upstream (git merge-base HEAD main), so every line
//     the fork added is checked.
//
//   bun urbicana/design-audit/run.ts browser --base-url <url> --output <path>
//       --screenshots <dir>
//     browser-check over every page. The routes come from the route files
//     (each file's createFileRoute path), less the ones Urbicana switches off.
//     A route with parameters ($slug, $handle...) is audited at the first link
//     to it that the other pages render, so its values come from the data.
//     URBICANA_AUDIT_TOKEN: a member's session token; pages are read signed in
//     (every platform read requires it).

import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { isSwitchedOff } from "../switched-off";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const upstreamDir = join(root, "scripts/design-audit");
const generatedDir = join(here, ".generated");

type Replacement = { from: string; to: string; count: number };

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

// Upstream's script with its scope replaced, its relative imports pointed back
// at scripts/design-audit/, written under .generated/.
async function generate(script: string, replacements: Replacement[]) {
  let code = await readFile(join(upstreamDir, script), "utf8");
  const problems: string[] = [];
  for (const { from, to, count } of replacements) {
    const found = code.split(from).length - 1;
    if (found !== count) {
      problems.push(`scripts/design-audit/${script}: expected ${count} of ${JSON.stringify(from)}, found ${found}`);
      continue;
    }
    code = code.split(from).join(to);
  }
  if (problems.length) throw new Error(`design-audit scope no longer matches upstream:\n  - ${problems.join("\n  - ")}`);
  code = code.replace(/from "\.\/([\w-]+)"/g, (_match, name: string) => `from "${join(upstreamDir, name)}"`);
  await mkdir(generatedDir, { recursive: true });
  const path = join(generatedDir, script);
  await writeFile(path, code);
  return path;
}

function run(path: string, args: string[], env: Record<string, string> = {}) {
  execFileSync("bun", [path, ...args], { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
}

async function source() {
  const output = argument("--output");
  if (!output) throw new Error("usage: run.ts source --output <path> [--base <sha> | --working-tree]");
  const workingTree = process.argv.includes("--working-tree");
  const base = argument("--base") ?? git("merge-base", "HEAD", "main");
  const path = await generate("source-check.ts", [
    {
      from: 'const sourceFiles = await listSourceFiles("src");',
      to: 'const sourceFiles = [...(await listSourceFiles("src")), ...(await listSourceFiles("urbicana"))].filter((file) => !file.startsWith("urbicana/design-audit/.generated/"));',
      count: 1,
    },
    {
      from: 'if (!path.startsWith("src/")) continue;',
      to: 'if (!path.startsWith("src/") && !path.startsWith("urbicana/")) continue;',
      count: 1,
    },
    {
      from: 'if (!added.file.startsWith("src/")) continue;',
      to: 'if (!added.file.startsWith("src/") && !added.file.startsWith("urbicana/")) continue;',
      count: 1,
    },
    { from: '"--", "src")', to: '"--", "src", "urbicana")', count: 2 },
  ]);
  run(path, workingTree ? ["--working-tree", "--output", output] : ["--base", base, "--output", output]);
}

// Every route file's declared path, e.g. createFileRoute("/skills/").
async function declaredRoutes() {
  const files: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.name.startsWith("-") || entry.name.includes(".test.")) continue;
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith(".tsx")) files.push(path);
    }
  };
  await walk(join(root, "src/routes"));
  const routes = new Set<string>();
  for (const file of files) {
    const match = /createFileRoute\("([^"]+)"\)/.exec(await readFile(file, "utf8"));
    if (!match) continue;
    const path = match[1] === "/" ? "/" : match[1].replace(/\/$/, "");
    if (!isSwitchedOff(path)) routes.add(path);
  }
  return [...routes].sort();
}

// Fixed routes as they are; each route with parameters at the first link to it
// that the fixed routes render, signed in.
async function resolveRoutes(baseUrl: string, token: string | undefined) {
  const declared = await declaredRoutes();
  const fixed = declared.filter((path) => !path.includes("$"));
  const patterns = declared
    .filter((path) => path.includes("$"))
    .map((path) => ({ path, regex: new RegExp(`^${path.replace(/\$[\w]+/g, "[^/]+")}$`) }));
  const found = new Map<string, string>();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    if (token) await signIn(context, baseUrl, token);
    const page = await context.newPage();
    for (const route of fixed) {
      await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(2_500);
      const links = await page.$$eval("a[href]", (anchors) => anchors.map((a) => (a as HTMLAnchorElement).href));
      for (const href of links) {
        const url = new URL(href);
        if (url.origin !== new URL(baseUrl).origin) continue;
        const path = url.pathname.replace(/\/$/, "") || "/";
        // A link to a fixed route belongs to that route, not to a pattern.
        if (fixed.includes(path)) continue;
        for (const pattern of patterns) {
          if (!found.has(pattern.path) && pattern.regex.test(path) && !isSwitchedOff(path)) found.set(pattern.path, path);
        }
      }
    }
  } finally {
    await browser.close();
  }
  const unlinked = patterns.map((pattern) => pattern.path).filter((path) => !found.has(path));
  return { routes: [...fixed, ...found.values()], unlinked };
}

async function signIn(context: import("@playwright/test").BrowserContext, baseUrl: string, token: string) {
  await context.addCookies([{ name: "urbicana_token", value: encodeURIComponent(token), url: baseUrl }]);
  await context.addInitScript((value) => {
    window.localStorage.setItem("urbicana.session", JSON.stringify({ token: value }));
  }, token);
}

async function browserCheck() {
  const baseUrl = argument("--base-url");
  const output = argument("--output");
  const screenshots = argument("--screenshots");
  if (!baseUrl || !output || !screenshots) {
    throw new Error("usage: run.ts browser --base-url <url> --output <path> --screenshots <dir>");
  }
  const token = process.env.URBICANA_AUDIT_TOKEN;
  const { routes, unlinked } = await resolveRoutes(baseUrl, token);
  console.log(`auditing ${routes.length} routes:\n  ${routes.join("\n  ")}`);
  if (unlinked.length) console.log(`no page links to (not audited):\n  ${unlinked.join("\n  ")}`);
  const path = await generate("browser-check.ts", [
    {
      from: 'const routes = ["/", "/skills", "/plugins"];',
      to: 'const routes = JSON.parse(process.env.URBICANA_AUDIT_ROUTES ?? "[]") as string[];',
      count: 1,
    },
    {
      from: "        await setTheme(context, theme);\n",
      to: [
        "        await setTheme(context, theme);",
        "        if (process.env.URBICANA_AUDIT_TOKEN) {",
        '          await context.addCookies([{ name: "urbicana_token", value: encodeURIComponent(process.env.URBICANA_AUDIT_TOKEN), url: baseUrl }]);',
        "          await context.addInitScript((value) => {",
        '            window.localStorage.setItem("urbicana.session", JSON.stringify({ token: value }));',
        "          }, process.env.URBICANA_AUDIT_TOKEN);",
        "        }",
        "",
      ].join("\n"),
      count: 1,
    },
  ]);
  run(path, ["--base-url", baseUrl, "--output", output, "--screenshots", screenshots], {
    URBICANA_AUDIT_ROUTES: JSON.stringify(routes),
  });
  // Recorded beside the evidence: the routes no page links to.
  await writeFile(join(screenshots, "unlinked-routes.json"), `${JSON.stringify(unlinked, null, 2)}\n`);
  console.log(`wrote ${relative(root, output)}`);
}

const mode = process.argv[2];
if (mode === "source") await source();
else if (mode === "browser") await browserCheck();
else throw new Error("usage: run.ts (source | browser) ...");
