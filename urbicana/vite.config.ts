// Upstream's Vite config with Urbicana's plugin added. Start or build with
// `--config urbicana/vite.config.ts` from the repository root; upstream's
// vite.config.ts is not edited.

import { mergeConfig } from "vite";
import upstream from "../vite.config";
import { urbicana } from "./plugin";

export default mergeConfig(upstream, { plugins: [urbicana()] });
