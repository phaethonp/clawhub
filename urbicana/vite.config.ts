// Upstream's Vite config with Urbicana's plugin added. Start or build with
// `--config urbicana/vite.config.ts` from the repository root; upstream's
// vite.config.ts is not edited.

import { mergeConfig } from "vite";
import upstream from "../vite.config";
import { urbicana } from "./plugin";

// mergeConfig(a, b) concatenates plugin lists a-first, so the Urbicana plugin
// comes before upstream's. It must: TanStack's router code splitter is also
// an early ("pre") plugin, and when it ran first it split route files from
// upstream's text, so a route the build renames (/publishers) reached the
// browser without its new component while the server rendered it.
export default mergeConfig(
  {
    plugins: [urbicana()],
    // On Node 22 "localhost" made the dev server listen on [::1] only, so a
    // browser connecting to 127.0.0.1 got nothing. Bind IPv4 loopback
    // explicitly; browsers fall back to it for "localhost". Loopback only:
    // nothing on the network can reach it.
    server: { host: "127.0.0.1" },
  },
  upstream,
);
