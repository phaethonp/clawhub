// Production: the upstream public files this site does not serve
// (NOT_SERVED in assets.ts; the build deletes them) answer 404 rather than
// falling through to the page renderer.

import { defineEventHandler } from "h3";

export default defineEventHandler(() => new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } }));
