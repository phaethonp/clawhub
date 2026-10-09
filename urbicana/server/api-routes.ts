// Production: ClawHub's public API paths its pages fetch directly
// (/api/v1/search, /api/v1/plugins, /api/v1/plugins/search,
// /api/v1/promotions, /api/v1/packages/<city plugin>/...), answered from data/http.ts like the development
// middleware does. These routes are more specific than ClawHub's /api/**
// handler (server/handlers/convexProxy.ts), so Nitro picks them first.

import { defineEventHandler, getRequestURL } from "h3";
import { httpRouteFor, tokenFromCookie } from "../data/http";

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const route = httpRouteFor(url.pathname);
  if (!route) return Response.json({ error: "Not found" }, { status: 404 });
  const origin = (process.env.URBICANA_RAILS_URL ?? "http://localhost:5000").replace(/\/+$/, "");
  try {
    const { status, body, contentType } = await route(url, tokenFromCookie(event.req.headers.get("cookie")), origin);
    if (contentType) return new Response(String(body), { status, headers: { "Content-Type": contentType } });
    return Response.json(body, { status });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 502 });
  }
});
