// Production: ClawHub's public API paths its pages fetch directly
// (/api/v1/search, /api/v1/plugins, /api/v1/plugins/search,
// /api/v1/promotions), answered from data/http.ts like the development
// middleware does. These routes are more specific than ClawHub's /api/**
// handler (server/handlers/convexProxy.ts), so Nitro picks them first.

import { defineEventHandler, getRequestURL } from "h3";
import { HTTP_ROUTES, tokenFromCookie } from "../data/http";

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const route = HTTP_ROUTES[url.pathname];
  if (!route) return Response.json({ error: "Not found" }, { status: 404 });
  const origin = (process.env.URBICANA_RAILS_URL ?? "http://localhost:5000").replace(/\/+$/, "");
  try {
    const { status, body } = await route(url, tokenFromCookie(event.req.headers.get("cookie")), origin);
    return Response.json(body, { status });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 502 });
  }
});
