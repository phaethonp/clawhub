// A ClawHub function, or one way of calling it, that Urbicana does not answer
// yet. Its page shows ClawHub's own loading or error state.
export class NotWiredError extends Error {
  constructor(readonly functionName: string, detail?: string) {
    super(`${functionName} is not available on Urbicana yet${detail ? ` (${detail})` : ""}.`);
  }
}
