// The client behind Urbicana's replacements for convex/react and
// convex/browser: runs a function by name through functions.ts, caches query
// results by name and arguments, and tells subscribed hooks when to refetch
// (after any mutation or action, and when the member signs in or out).

import { getFunctionName } from "convex/server";
import { NotWiredError } from "./errors";
import { handlerFor, READ_ONLY } from "./functions";
import { session } from "./session";

export { NotWiredError };

export type FunctionRef = Parameters<typeof getFunctionName>[0];

export function nameOf(ref: FunctionRef | string): string {
  return typeof ref === "string" ? ref : getFunctionName(ref);
}

export async function run(ref: FunctionRef | string, args: Record<string, unknown> = {}) {
  const name = nameOf(ref);
  const handler = handlerFor(name);
  if (!handler) throw new NotWiredError(name);
  return await handler(args);
}

type Entry = { value?: unknown; error?: unknown; settled: boolean; promise?: Promise<void> };
type Listener = () => void;

const entries = new Map<string, Entry>();
// Last settled value per key, shown while a refetch after invalidate runs,
// so a page keeps its data instead of flashing back to loading.
const previous = new Map<string, unknown>();
const listeners = new Set<Listener>();
let generation = 0;

export function cacheKey(name: string, args: unknown) {
  return `${name}|${JSON.stringify(args ?? {})}`;
}

let version = 0;

function notify() {
  version += 1;
  for (const listener of listeners) listener();
}

export const queryStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  generation() {
    return generation;
  },
  // Changes whenever any query settles or the cache is dropped; hooks
  // re-render on it and read their own value.
  version() {
    return version;
  },
  // Whether the query's current result has settled since the last drop.
  isFresh(name: string, args: Record<string, unknown>) {
    const entry = entries.get(cacheKey(name, args));
    return Boolean(entry?.settled);
  },
  // The cached entry for a query, starting the request if there is none.
  read(name: string, args: Record<string, unknown>): Entry {
    const key = cacheKey(name, args);
    let entry = entries.get(key);
    if (entry) return entry;
    entry = { settled: false };
    entries.set(key, entry);
    const handler = handlerFor(name);
    if (!handler) return entry; // never settles: the page keeps its loading state
    const current = entry;
    current.promise = handler(args).then(
      (value) => {
        current.value = value;
        current.settled = true;
        notify();
      },
      (error) => {
        current.error = error;
        current.settled = true;
        console.warn(`[urbicana] ${name} failed:`, error);
        notify();
      },
    );
    return current;
  },
  // The value a hook shows for this query now: the settled result, or the
  // previous one while a refetch runs, or undefined (loading).
  snapshot(name: string, args: Record<string, unknown>): unknown {
    const key = cacheKey(name, args);
    const entry = this.read(name, args);
    if (entry.settled && entry.error === undefined) return entry.value;
    return previous.get(key);
  },
  // Drop every cached result so mounted hooks fetch again.
  invalidate(options: { keepPrevious?: boolean } = {}) {
    previous.clear();
    if (options.keepPrevious !== false) {
      for (const [key, entry] of entries) {
        if (entry.settled && entry.error === undefined) previous.set(key, entry.value);
      }
    }
    entries.clear();
    generation += 1;
    notify();
  },
};

// A different member sees different data: nothing carries over.
session.subscribe(() => queryStore.invalidate({ keepPrevious: false }));

// A mutation or action: run it, then refetch what pages show, unless the
// function only reads (READ_ONLY in functions.ts).
export async function runAndInvalidate(ref: FunctionRef | string, args: Record<string, unknown> = {}) {
  const name = nameOf(ref);
  if (READ_ONLY.has(name)) return await run(name, args);
  try {
    return await run(name, args);
  } finally {
    queryStore.invalidate();
  }
}
