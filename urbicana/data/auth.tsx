// Urbicana's stand-in for "@convex-dev/auth/react". ClawHub signs in with
// GitHub; Urbicana signs in with the member's Urbicana account (email and
// password, POST /api/v1/auth/sign_in). Every "Sign in with GitHub" call in
// ClawHub's pages, signIn("github", { redirectTo }), opens this dialog. The
// dialog is built from ClawHub's own dialog, input and button components.

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Button } from "../../src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../src/components/ui/dialog";
import { Input } from "../../src/components/ui/input";
import { Label } from "../../src/components/ui/label";
import { SITE_NAME } from "../brand";
import { session } from "./session";

type DialogState = { open: boolean; redirectTo?: string };
let dialog: DialogState = { open: false };
const dialogListeners = new Set<() => void>();

function setDialog(next: DialogState) {
  dialog = next;
  for (const listener of dialogListeners) listener();
}

function subscribeDialog(listener: () => void) {
  dialogListeners.add(listener);
  return () => dialogListeners.delete(listener);
}

export function useAuthActions() {
  return {
    signIn: async (_provider?: string, params?: { redirectTo?: string } | Record<string, unknown>) => {
      const redirectTo =
        params && typeof (params as { redirectTo?: unknown }).redirectTo === "string"
          ? (params as { redirectTo: string }).redirectTo
          : undefined;
      setDialog({ open: true, redirectTo });
      // ClawHub's buttons read signingIn: false (with no redirect) as a
      // failed sign-in; the dialog being open is a sign-in under way.
      return { signingIn: true };
    },
    signOut: async () => {
      await session.signOut();
    },
  };
}

export function useAuthToken() {
  return useSyncExternalStore(session.subscribe, session.token, () => null);
}

function SignInDialog() {
  const state = useSyncExternalStore(subscribeDialog, () => dialog, () => dialog);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setDialog({ open: false });
    setPassword("");
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await session.signIn(email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const redirectTo = state.redirectTo;
    close();
    if (redirectTo && typeof window !== "undefined") window.location.assign(redirectTo);
  };

  return (
    <Dialog open={state.open} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to {SITE_NAME}</DialogTitle>
          <DialogDescription>Use the email and password of your Urbicana account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="urbicana-sign-in-email">Email</Label>
            <Input
              id="urbicana-sign-in-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="urbicana-sign-in-password">Password</Label>
            <Input
              id="urbicana-sign-in-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConvexAuthProvider({ children }: { client?: unknown; children?: ReactNode; [key: string]: unknown }) {
  return (
    <>
      {children}
      <SignInDialog />
    </>
  );
}
