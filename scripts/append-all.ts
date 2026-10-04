// Append one array onto another without spreading it into a call.
//
// `target.push(...items)` passes every element as a separate argument, and
// V8's argument limit is a stack-size budget rather than a constant. It held
// at 118,383 endpoints on 2026-09-30 and threw "Maximum call stack size
// exceeded" at 125,922 on 2026-10-03 — after a 28-minute crawl had already
// finished successfully. The throw was caught by the orchestrator's
// per-fetcher `catch`, x402scan was recorded `status: "failed"` with count 0,
// and the run collected 88 endpoints against a real 125,922. Three days of
// catalog damage came from this one line, and it will recur at every size
// above the threshold, which moves with the stack.
//
// Its own module so there is something a test can import: the orchestrator
// (scripts/fetch-directories.ts) runs the live fetch on import.

/** Appends `items` onto `target` in place. Returns `target`. */
export function appendAll<T>(target: T[], items: readonly T[]): T[] {
  for (const item of items) target.push(item);
  return target;
}
