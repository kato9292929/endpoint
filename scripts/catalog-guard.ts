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
  const truncated = report.filter((r) => r.truncated).map((r) => r.source);
  const failed = report
    .filter((r) => r.status === "failed")
    .map((r) => r.source);

  if (freshCount === 0) {
    return {
      publish: false,
      degraded: {
        reason: "no endpoints collected",
        sources: failed.length ? failed : truncated,
        kept_previous: true,
        collected: 0,
        previous: previousCount,
      },
    };
  }

  if (truncated.length === 0) return { publish: true };

  // Incomplete. Publish only if it would not shrink the catalog — a first run
  // (previousCount 0) therefore still publishes what it managed to get.
  if (freshCount < previousCount * DEGRADED_SHRINK_TOLERANCE) {
    return {
      publish: false,
      degraded: {
        reason: "truncated fetch would have shrunk the catalog",
        sources: truncated,
        kept_previous: true,
        collected: freshCount,
        previous: previousCount,
      },
    };
  }

  // Published, but still incomplete — downstream must not read these numbers
  // as a full census.
  return {
    publish: true,
    degraded: {
      reason: "a source did not reach the end of its list",
      sources: truncated,
      kept_previous: false,
      collected: freshCount,
      previous: previousCount,
    },
  };
}
