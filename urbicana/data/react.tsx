// Urbicana's stand-in for "convex/react". plugin.ts points that import here,
// so ClawHub's pages keep calling useQuery / useMutation / useAction /
// usePaginatedQuery / useQueries / useConvex / useConvexAuth unchanged, and
// the calls are answered by functions.ts instead of Convex.
//
// Queries run in the browser only; on the server a hook reports loading, as
// Convex's does before its websocket connects.

import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { type FunctionRef, nameOf, queryStore, run, runAndInvalidate } from "./client";
import { session } from "./session";

type Args = Record<string, unknown>;

export type RequestForQueries = Record<string, { query: FunctionRef; args: Args }>;

const isBrowser = () => typeof window !== "undefined";

function useStoreVersion() {
  return useSyncExternalStore(queryStore.subscribe, queryStore.version, () => 0);
}

export class ConvexReactClient {
  readonly url: string;
  constructor(url?: string, _options?: unknown) {
    this.url = url ?? "";
  }
  query(ref: FunctionRef, args: Args = {}) {
    return run(ref, args);
  }
  mutation(ref: FunctionRef, args: Args = {}) {
    return runAndInvalidate(ref, args);
  }
  action(ref: FunctionRef, args: Args = {}) {
    return runAndInvalidate(ref, args);
  }
  setAuth() {}
  clearAuth() {}
  async close() {}
}

const sharedClient = new ConvexReactClient();

export function ConvexProvider({ children }: { client?: unknown; children?: ReactNode }) {
  return <>{children}</>;
}

export function useConvex() {
  return sharedClient;
}

export function useQuery(ref: FunctionRef, ...rest: [Args | "skip"] | []) {
  useStoreVersion();
  const args = rest[0];
  if (args === "skip" || !isBrowser()) return undefined;
  return queryStore.snapshot(nameOf(ref), args ?? {}) as any;
}

export function useQueries(queries: RequestForQueries) {
  const v = useStoreVersion();
  const key = JSON.stringify(Object.entries(queries).map(([k, q]) => [k, nameOf(q.query), q.args]));
  return useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const [k, q] of Object.entries(queries)) {
      result[k] = isBrowser() ? queryStore.snapshot(nameOf(q.query), q.args ?? {}) : undefined;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, v]);
}

type Mutation = ((args?: Args) => Promise<any>) & { withOptimisticUpdate: () => Mutation };

function useCaller(ref: FunctionRef): Mutation {
  const name = nameOf(ref);
  const fn = useCallback((args?: Args) => runAndInvalidate(name, args ?? {}), [name]) as Mutation;
  fn.withOptimisticUpdate = () => fn;
  return fn;
}

export function useMutation(ref: FunctionRef) {
  return useCaller(ref);
}

export function useAction(ref: FunctionRef) {
  return useCaller(ref);
}

type PaginatedPage = { page?: unknown[]; isDone?: boolean; continueCursor?: string };

// Convex pages a query with paginationOpts; here one request asks for every
// item loaded so far, and loadMore asks for more.
export function usePaginatedQuery(
  ref: FunctionRef,
  args: Args | "skip",
  options: { initialNumItems: number },
) {
  useStoreVersion();
  const [numItems, setNumItems] = useState(options.initialNumItems);
  const loadMore = useCallback((n: number) => setNumItems((count) => count + n), []);
  if (args === "skip" || !isBrowser()) {
    return { results: [], status: "LoadingFirstPage" as const, isLoading: true, loadMore };
  }
  const name = nameOf(ref);
  const queryArgs = { ...args, paginationOpts: { numItems, cursor: null } };
  const value = queryStore.snapshot(name, queryArgs) as PaginatedPage | undefined;
  const fresh = queryStore.isFresh(name, queryArgs);
  if (value === undefined) {
    return { results: [], status: "LoadingFirstPage" as const, isLoading: true, loadMore };
  }
  const results = value.page ?? [];
  const status = !fresh ? "LoadingMore" : value.isDone ? "Exhausted" : "CanLoadMore";
  return { results, status: status as "LoadingMore" | "Exhausted" | "CanLoadMore", isLoading: !fresh, loadMore };
}

export function useConvexAuth() {
  const isAuthenticated = useSyncExternalStore(session.subscribe, session.isSignedIn, () => false);
  return { isLoading: false, isAuthenticated };
}

export function Authenticated({ children }: { children?: ReactNode }) {
  return useConvexAuth().isAuthenticated ? <>{children}</> : null;
}

export function Unauthenticated({ children }: { children?: ReactNode }) {
  return useConvexAuth().isAuthenticated ? null : <>{children}</>;
}

export function AuthLoading(_props: { children?: ReactNode }) {
  return null;
}
