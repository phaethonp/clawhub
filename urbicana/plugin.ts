// The Vite plugin that turns upstream ClawHub into the Urbicana Registry
// without editing upstream's files:
//
// - renames ClawHub's name, description and host in src/ as it is compiled
//   (rename.ts), failing if a file's counts differ from the manifest;
// - serves urbicana/public/ at upstream's public paths in dev, and copies it
//   over upstream's in the build output (assets.ts);
// - runs the brand check when the build or dev server starts (check.ts);
// - answers ClawHub's backend calls from Urbicana's Rails: the imports
//   "convex/react", "convex/browser" and "@convex-dev/auth/react" resolve to
//   urbicana/data/ instead of Convex (functions.ts holds the mapping), and in
//   development /urbicana-api is forwarded to Rails.

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import type { Nitro } from "nitro/types";
import type { Alias, Plugin, UserConfig } from "vite";
import { NOT_SERVED, replacements } from "./assets";
import { checkAll, repoRoot } from "./check";
import { HTTP_ROUTES, httpRouteFor, tokenFromCookie } from "./data/http";
import { isRenamedSource, rename } from "./rename";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
};

// Where the built site's public files land (Nitro, and Vercel's output).
const OUTPUT_PUBLIC_DIRS = [".output/public", ".vercel/output/static"];
// Where the built server reads its share-image artwork (scripts/copy-og-assets.ts
// copies upstream's there; Urbicana's replace them).
const OUTPUT_SERVER_DIRS = [".output/server", ".vercel/output/functions/__server.func"];
const OG_ART = ["clawd-logo.png", "clawd-mark.png", "og-clawhub-watermark.png"];

export function urbicana(): Plugin {
  const root = repoRoot();
  const ours = new Set(replacements(root));

  const data = (file: string) => join(root, "urbicana", "data", file);
  const replaced: Record<string, string> = {
    "convex/react": data("react.tsx"),
    "convex/browser": data("browser.ts"),
    "@convex-dev/auth/react": data("auth.tsx"),
  };

  const server = (file: string) => join(root, "urbicana", "server", file);

  return {
    name: "urbicana-brand",
    enforce: "pre",

    // Production server routes. Nitro takes a module from any Vite plugin
    // that carries one (nitro/dist/vite.mjs: plugin.nitro), so Urbicana's
    // handlers are added without editing upstream's nitro() options. In
    // development the middleware below answers these paths first.
    nitro: {
      setup(nitro: Nitro) {
        // Nitro lists the static files it serves when it builds; files this
        // site does not serve are left out there, so they answer 404 instead
        // of a 500 for a listed file the build step deleted.
        for (const asset of nitro.options.publicAssets) {
          // ignore may be false (scan everything); the default is nitro's own.
          const current = asset.ignore === false ? [] : (asset.ignore ?? nitro.options.ignore ?? []);
          asset.ignore = [...current, ...NOT_SERVED.map((file) => `public/${file}`)];
        }
        nitro.options.handlers.unshift(
          { route: "/urbicana-api/**", handler: server("rails-forward.ts") },
          ...Object.keys(HTTP_ROUTES).map((route) => ({ route, handler: server("api-routes.ts") })),
          { route: "/api/v1/packages/**", handler: server("api-routes.ts") },
          ...NOT_SERVED.map((file) => ({ route: `/${file}`, handler: server("not-served.ts") })),
        );
      },
    },

    // Upstream's config already aliases these three imports to Convex's own
    // files and pre-bundles them; point the aliases at urbicana/data/ and
    // drop them from pre-bundling so the replacement is what loads.
    config(config: UserConfig) {
      const resolve = (config.resolve ??= {});
      const alias = resolve.alias;
      if (Array.isArray(alias)) {
        for (const [find, target] of Object.entries(replaced)) {
          const entry = (alias as Alias[]).find((a) => a.find === find);
          if (entry) entry.replacement = target;
          else (alias as Alias[]).unshift({ find, replacement: target });
        }
      } else {
        resolve.alias = { ...(alias as Record<string, string> | undefined), ...replaced };
      }
      const include = config.optimizeDeps?.include;
      if (include) config.optimizeDeps!.include = include.filter((dep) => !(dep in replaced));
      config.optimizeDeps = {
        ...config.optimizeDeps,
        exclude: [...(config.optimizeDeps?.exclude ?? []), ...Object.keys(replaced)],
      };
    },

    buildStart() {
      const problems = checkAll(root);
      if (problems.length) {
        this.error(
          `urbicana brand check failed (bun urbicana/check.ts):\n${problems.map((p) => `  - ${p}`).join("\n")}`,
        );
      }
    },

    transform(code, id) {
      const path = id.split("?")[0];
      if (!isRenamedSource(path)) return null;
      const result = rename(code, path);
      if (result.code === code) return null;
      return { code: result.code, map: null };
    },

    configureServer(server) {
      // The fork's own address, for pages rendered on the server that call
      // ClawHub's public API (src/lib/publicApiUrl.ts, rule in copy.ts).
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        if (address && typeof address === "object") {
          process.env.URBICANA_SELF_ORIGIN = `http://127.0.0.1:${address.port}`;
        }
      });
      // Development only: forward /urbicana-api/* to Rails' /api/v1/*. Done
      // here rather than with server.proxy because TanStack Start's server
      // middleware answers unknown paths before Vite's proxy sees them.
      const railsOrigin = (process.env.URBICANA_RAILS_URL ?? "http://localhost:5000").replace(/\/+$/, "");
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/urbicana-api/")) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers: Record<string, string> = {};
          for (const name of ["accept", "authorization", "content-type"]) {
            const value = req.headers[name];
            if (typeof value === "string") headers[name] = value;
          }
          const upstream = await fetch(`${railsOrigin}/api/v1${req.url.slice("/urbicana-api".length)}`, {
            method: req.method,
            headers,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          });
          res.statusCode = upstream.status;
          const type = upstream.headers.get("content-type");
          if (type) res.setHeader("Content-Type", type);
          res.end(Buffer.from(await upstream.arrayBuffer()));
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Rails is not reachable at ${railsOrigin}: ${String(error)}` }));
        }
      });

      // Development: ClawHub's public API paths its pages fetch directly
      // (data/http.ts), answered before ClawHub's own /api/** handler.
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        const route = path.startsWith("/api/") ? httpRouteFor(path) : undefined;
        if (!route) return next();
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const token = tokenFromCookie(req.headers.cookie);
          const { status, body, contentType } = await route(url, token, railsOrigin);
          res.statusCode = status;
          res.setHeader("Content-Type", contentType ?? "application/json");
          res.end(contentType ? String(body) : JSON.stringify(body));
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: String(error) }));
        }
      });

      server.middlewares.use((req, res, next) => {
        const file = decodeURIComponent((req.url ?? "").split("?")[0]).replace(/^\//, "");
        if (NOT_SERVED.includes(file)) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        if (ours.has(file)) {
          res.setHeader("Content-Type", CONTENT_TYPES[extname(file)] ?? "application/octet-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.end(readFileSync(join(root, "urbicana", "public", file)));
          return;
        }
        // Upstream's own public files (robots.txt, app icons, ...). Served here
        // because, under Node, the dev server's static-file path (srvx 0.11's
        // Node adapter) passes writeHead a list of header pairs, which Node
        // rejects, and the process exits with ERR_INVALID_ARG_VALUE. ClawHub
        // runs its dev server under Bun, which accepts that shape; this fork
        // runs it under Node (SYNC.md).
        const upstream = join(root, "public", file);
        if (!file || file.includes("..") || !existsSync(upstream) || !statSync(upstream).isFile()) return next();
        res.setHeader("Content-Type", CONTENT_TYPES[extname(file)] ?? "application/octet-stream");
        res.end(readFileSync(upstream));
      });
    },

    closeBundle: {
      order: "post",
      handler() {
        for (const outDir of OUTPUT_PUBLIC_DIRS) {
          const target = join(root, outDir);
          if (!existsSync(target)) continue;
          for (const file of ours) {
            const dest = join(target, file);
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(join(root, "urbicana", "public", file), dest);
          }
          for (const file of NOT_SERVED) rmSync(join(target, file), { force: true });
        }
        for (const outDir of OUTPUT_SERVER_DIRS) {
          const target = join(root, outDir);
          if (!existsSync(target)) continue;
          for (const file of OG_ART) copyFileSync(join(root, "urbicana", "public", file), join(target, file));
        }
      },
    },
  };
}
