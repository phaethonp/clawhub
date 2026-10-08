// The member's session: the Rails access token, kept in this browser.
//
// Sign-in posts email and password to POST /api/v1/auth/sign_in, the same
// endpoint urbicana.com uses. An account whose email is not yet verified gets
// `requires_otp` back; verifying happens on urbicana.com for now.

import { RailsError, rails } from "./rails";

const STORAGE_KEY = "urbicana.session";

// The token is also kept in a same-site cookie, so requests the browser makes
// without our client (ClawHub's pages fetch /api/v1/search directly) carry
// the member to the fork's server, which reads it in http.ts.
export const SESSION_COOKIE = "urbicana_token";

export function tokenFromCookie(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("=")) || null;
  }
  return null;
}

// The member's token wherever this runs: this browser's session, or on the
// fork's server while it renders a page, the session cookie of the request
// being rendered (read the way src/lib/packageApi.ts reads request headers).
export async function currentToken(): Promise<string | null> {
  if (typeof window !== "undefined") return session.token();
  try {
    const serverRuntimeModule = "@tanstack/react-start/server";
    const { getRequestHeaders } = (await import(/* @vite-ignore */ serverRuntimeModule)) as {
      getRequestHeaders: () => Headers;
    };
    return tokenFromCookie(getRequestHeaders().get("cookie"));
  } catch {
    return null;
  }
}

function writeCookie(token: string | null, exp?: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (!token) {
    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
    return;
  }
  const now = Date.now() / 1000;
  const maxAge = typeof exp === "number" && exp > now ? Math.floor(exp - now) : 60 * 60 * 24;
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`;
}

type Stored = { token: string; refreshToken?: string; exp?: number };
type Listener = () => void;

const listeners = new Set<Listener>();
let current: Stored | null | undefined;

function load(): Stored | null {
  if (current !== undefined) return current;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    current = raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    current = null;
  }
  // A session from before the cookie existed gets one now.
  if (current && !document.cookie.includes(`${SESSION_COOKIE}=`)) writeCookie(current.token, current.exp);
  return current;
}

function save(next: Stored | null) {
  current = next;
  writeCookie(next?.token ?? null, next?.exp);
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the session lasts for this page only.
  }
  for (const listener of listeners) listener();
}

type SignInResponse = {
  success?: boolean;
  requires_otp?: boolean;
  message?: string;
  access_token?: string;
  refresh_token?: string;
  exp?: number;
};

export type SignInResult = { ok: true } | { ok: false; message: string };

export const session = {
  token(): string | null {
    return load()?.token ?? null;
  },
  isSignedIn(): boolean {
    return Boolean(load()?.token);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  clear() {
    if (load()) save(null);
  },
  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      const response = await rails<SignInResponse>("/auth/sign_in", {
        method: "POST",
        body: { email, password },
        signedIn: false,
      });
      if (response.requires_otp) {
        return {
          ok: false,
          message: "Your email is not verified yet. Verify it on urbicana.com, then sign in here.",
        };
      }
      if (!response.access_token) return { ok: false, message: "Sign in failed. Please try again." };
      save({ token: response.access_token, refreshToken: response.refresh_token, exp: response.exp });
      return { ok: true };
    } catch (error) {
      // Rails answers an unknown email with a database message and a wrong
      // password with an error code; the member sees one sentence for both.
      if (error instanceof RailsError && error.status >= 400 && error.status < 500) {
        return { ok: false, message: "Email or password is incorrect." };
      }
      return { ok: false, message: "Sign-in is not reachable right now. Please try again." };
    }
  },
  async signOut() {
    if (!load()) return;
    try {
      await rails("/auth/log_out", { method: "POST" });
    } catch {
      // The local session ends either way.
    }
    save(null);
  },
};
