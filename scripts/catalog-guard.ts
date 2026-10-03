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

  // Every way a run can come back short. Guarding only `truncated` left the
  // hole that mattered: when x402scan threw on its first page the entry was
  // `status: "failed"`, nothing was truncated, and a catalog of 88 endpoints
  // (pay-sh and the seed, with x402scan contributing nothing) sailed through
  // as if it were complete.
  //
  // `empty` counts too — an implemented source returning 0 rows is the same
  // hole wearing a different status. onyx-bazaar sits at `empty` every day, so
  // this is usually true and the shrink test below is what actually decides.
  // That is the intended shape: a healthy run grows or holds steady and
  // publishes regardless, while anything that would gut the catalog has to
  // get past a second question.
  const incomplete = report
    .filter((r) => r.truncated || r.status === "failed" || r.status === "empty")
    .map((r) => r.source);

  if (freshCount === 0) {
    return {
      publish: false,
      degraded: {
        reason: "no endpoints collected",
        sources: failed.length ? failed : incomplete,
        kept_previous: true,
        collected: 0,
        previous: previousCount,
      },
    };
  }

  if (incomplete.length === 0) return { publish: true };

  // Incomplete. Publish only if it would not shrink the catalog — a first run
  // (previousCount 0) therefore still publishes what it managed to get.
  if (freshCount < previousCount * DEGRADED_SHRINK_TOLERANCE) {
    return {
      publish: false,
      degraded: {
        reason: "an incomplete fetch would have shrunk the catalog",
        sources: incomplete,
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
      reason: "a source did not return a complete list",
      sources: incomplete,
      kept_previous: false,
      collected: freshCount,
      previous: previousCount,
    },
  };
}
