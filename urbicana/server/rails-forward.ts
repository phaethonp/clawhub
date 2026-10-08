// Production: forwards /urbicana-api/* to Rails' /api/v1/* (URBICANA_RAILS_URL),
// as plugin.ts's development middleware does. Registered as a Nitro handler by
// plugin.ts's Nitro module; the browser and the server's route loaders call
// /urbicana-api, so no CORS entry is needed for the hub's own origin.

import { defineEventHandler, getRequestURL } from "h3";

const FORWARDED_HEADERS = ["accept", "authorization", "content-type"];

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const origin = (process.env.URBICANA_RAILS_URL ?? "http://localhost:5000").replace(/\/+$/, "");
  const target = `${origin}/api/v1${url.pathname.slice("/urbicana-api".length)}${url.search}`;
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = event.req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const method = event.req.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await event.req.arrayBuffer();
  try {
    const response = await fetch(target, { method, headers, body });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ error: "Rails is not reachable." }, { status: 502 });
  }
});
