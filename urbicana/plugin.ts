// The Vite plugin that turns upstream ClawHub into the Urbicana Registry
// without editing upstream's files:
//
// - renames ClawHub's name, description and host in src/ as it is compiled
//   (rename.ts), failing if a file's counts differ from the manifest;
// - serves urbicana/public/ at upstream's public paths in dev, and copies it
//   over upstream's in the build output (assets.ts);
// - runs the brand check when the build or dev server starts (check.ts).

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import type { Plugin } from "vite";
import { NOT_SERVED, replacements } from "./assets";
import { checkAll, repoRoot } from "./check";
import { isRenamedSource, rename } from "./rename";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

// Where the built site's public files land (Nitro, and Vercel's output).
const OUTPUT_PUBLIC_DIRS = [".output/public", ".vercel/output/static"];

export function urbicana(): Plugin {
  const root = repoRoot();
  const ours = new Set(replacements(root));

  return {
    name: "urbicana-brand",
    enforce: "pre",

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
      const result = rename(code);
      if (result.code === code) return null;
      return { code: result.code, map: null };
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = decodeURIComponent((req.url ?? "").split("?")[0]).replace(/^\//, "");
        if (NOT_SERVED.includes(file)) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        if (!ours.has(file)) return next();
        res.setHeader("Content-Type", CONTENT_TYPES[extname(file)] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.end(readFileSync(join(root, "urbicana", "public", file)));
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
      },
    },
  };
}
