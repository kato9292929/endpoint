// Whether a run's result may replace the published catalog.
//
// On 2026-10-01..03 the x402scan crawl died mid-run three days running. Each
// time the orchestrator published what it had — 19,402 then 17,812 then 7,995
// endpoints, against a real directory of ~132,000. The site, the daily stats
// and the providers list all followed it down. Every run recorded
// `truncated: true` faithfully; nothing acted on it.
//
// So: a run that did not reach the end of a source is not a smaller catalog,
// it is an unfinished one. Stale and complete beats fresh and gutted.
//
// Kept in its own module because scripts/fetch-directories.ts runs the live
// fetch on import — a test may not import that.

import type { Catalog, FetchReportEntry } from "../src/lib/types";

// How far a truncated run may fall below the previous catalog before we
// refuse it. A COMPLETE run may shrink for real reasons (upstream
// deprecations), so this only governs runs already flagged `truncated`.
export const DEGRADED_SHRINK_TOLERANCE = 0.98;

export type RunAssessment = {
  /** false → keep the previous catalog; the fresh one is not good enough. */
  publish: boolean;
  degraded?: NonNullable<Catalog["degraded"]>;
};

export function assessRun(input: {
  /** Distinct endpoints this run collected (0 when everything failed). */
  freshCount: number;
  /** Endpoints the published catalog currently holds. */
  previousCount: number;
  report: FetchReportEntry[];
}): RunAssessment {
  const { freshCount, previousCount, report } = input;
  const failed = report
    .filter((r) => r.status === "failed")
    .map((r) => r.source);

  // Two different questions, and conflating them cost us the daily stats.
  //
  // `blocking` is what may NOT quietly gut the catalog. `empty` belongs here:
  // when x402scan returns 0 rows without throwing, nothing is truncated and
  // nothing failed, yet the run carries 88 endpoints. That is the hole that
  // published a gutted catalog once already.
  //
  // `unfinished` is what makes the numbers un-citable — a source that was cut
  // off mid-list, so the total is an unknown fraction of the real one.
  // `empty` does NOT belong here: onyx-bazaar has returned 0 rows every day
  // since 2026-08-28, and treating that as "this run is degraded" flagged
  // every single run, which stopped data/stats/*.json being written at all.
  // A chronically dead side source does not make 127,036 endpoints a
  // half-count; a truncated x402scan does.
  const blocking = report
    .filter((r) => r.truncated || r.status === "failed" || r.status === "empty")
    .map((r) => r.source);
  const unfinished = report
    .filter((r) => r.truncated || r.status === "failed")
    .map((r) => r.source);

  if (freshCount === 0) {
    return {
      publish: false,
      degraded: {
        reason: "no endpoints collected",
        sources: failed.length ? failed : blocking,
        kept_previous: true,
        collected: 0,
        previous: previousCount,
      },
    };
  }

  // Would this run shrink the catalog, and did anything come back short? Then
  // the shrinkage is far more likely to be our fetch than an upstream purge.
  // A first run (previousCount 0) still publishes what it managed to get.
  if (
    blocking.length > 0 &&
    freshCount < previousCount * DEGRADED_SHRINK_TOLERANCE
  ) {
    return {
      publish: false,
      degraded: {
        reason: "an incomplete fetch would have shrunk the catalog",
        sources: blocking,
        kept_previous: true,
        collected: freshCount,
        previous: previousCount,
      },
    };
  }

  // Grew, or shrank for reasons nothing flagged. Publishable either way; the
  // only remaining question is whether the total can be cited as a census.
  if (unfinished.length === 0) return { publish: true };

  // Published, but a source was cut off mid-list — downstream must not read
  // these numbers as a full census.
  return {
    publish: true,
    degraded: {
      reason: "a source did not return a complete list",
      sources: unfinished,
      kept_previous: false,
      collected: freshCount,
      previous: previousCount,
    },
  };
}
