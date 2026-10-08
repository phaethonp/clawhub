// Urbicana's stand-in for "convex/browser": ClawHub's route loaders call
// ConvexHttpClient.query / .action; here those run through functions.ts.

import { type FunctionRef, run, runAndInvalidate } from "./client";

type Args = Record<string, unknown>;

export class ConvexHttpClient {
  readonly url: string;
  constructor(url?: string, _options?: unknown) {
    this.url = url ?? "";
  }
  query(ref: FunctionRef, args: Args = {}): Promise<any> {
    return run(ref, args);
  }
  mutation(ref: FunctionRef, args: Args = {}): Promise<any> {
    return runAndInvalidate(ref, args);
  }
  action(ref: FunctionRef, args: Args = {}): Promise<any> {
    return runAndInvalidate(ref, args);
  }
  setAuth() {}
  clearAuth() {}
}
