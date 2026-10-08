// Requests to Urbicana's Rails API (app_v2, /api/v1).
//
// In the browser during development the fork's own server forwards /urbicana-api to
// Rails (plugin.ts), so no CORS entry is needed for localhost. A deployed
// site sets VITE_URBICANA_RAILS_URL to the API's origin; Rails already
// allows any *.urbicana.com origin. On the server (route loaders) the
// member's token comes from the session cookie of the request being rendered.

import { currentToken, session } from "./session";

const DEV_SERVER_RAILS = "http://localhost:5000";

function base() {
  // import.meta.env exists in code Vite serves; the fork's own server code
  // (plugin.ts, http.ts) always passes `origin` and never reaches here.
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  const configured = env?.VITE_URBICANA_RAILS_URL?.replace(/\/+$/, "");
  if (typeof window !== "undefined") return configured ? `${configured}/api/v1` : "/urbicana-api";
  const server = configured ?? process.env.URBICANA_RAILS_URL ?? DEV_SERVER_RAILS;
  return `${server.replace(/\/+$/, "")}/api/v1`;
}

export class RailsError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  // Send the member's token. Without one the request is not made.
  signedIn?: boolean;
  // The member's token when the caller has it from elsewhere (the fork's
  // server reads it from the session cookie); otherwise this browser's.
  token?: string | null;
  // The Rails origin when called from the fork's server.
  origin?: string;
};

export async function rails<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token !== undefined ? options.token : await currentToken();
  if (options.signedIn !== false && !token) throw new RailsError(401, "Sign in required.");
  const root = options.origin ? `${options.origin.replace(/\/+$/, "")}/api/v1` : base();
  const url = new URL(`${root}${path}`, typeof window !== "undefined" ? window.location.origin : undefined);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token && options.signedIn !== false) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const json = text ? safeJson(text) : null;
  if (!response.ok) {
    const message =
      (json && typeof json === "object" && ("error" in json || "message" in json)
        ? String((json as Record<string, unknown>).error ?? (json as Record<string, unknown>).message)
        : null) ?? `Request failed (${response.status}).`;
    // Rails answers a missing, expired or revoked token with 401, or with 422
    // and "Error::AuthorizationError" (Api::BaseController). Both end the
    // session and read as 401 to callers.
    const unauthorized = response.status === 401 || message.includes("AuthorizationError");
    if (unauthorized && options.signedIn !== false && options.token === undefined) session.clear();
    throw new RailsError(unauthorized ? 401 : response.status, message);
  }
  return json as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
