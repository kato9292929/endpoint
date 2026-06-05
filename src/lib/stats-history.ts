// Reads the daily stats snapshots committed under data/stats/ and builds a
// time series for /api/stats. Runs at request time (the route is
// force-dynamic), so the snapshot files are bundled into the serverless
// function via `outputFileTracingIncludes` in next.config.js.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Snapshot = {
  date: string;
  generatedAt: string;
  total: number;
  byCategory: Record<string, number>;
  byChain: Record<string, number>;
  bySource: Record<string, number>;
  byPriceTier: Record<string, number>;
};

export type SeriesPoint =
  | ({ present: true } & Snapshot)
  | { date: string; present: false; total: null };

const STATS_DIR = join(process.cwd(), "data", "stats");
const DATE_RE = /^(\d{4}-\d{2}-\d{2})\.json$/;

function loadSnapshots(): Map<string, Snapshot> {
  const map = new Map<string, Snapshot>();
  let files: string[] = [];
  try {
    files = readdirSync(STATS_DIR);
  } catch {
    return map; // no snapshots yet
  }
  for (const f of files) {
    const m = f.match(DATE_RE);
    if (!m) continue;
    try {
      const snap = JSON.parse(readFileSync(join(STATS_DIR, f), "utf8")) as Snapshot;
      map.set(m[1], snap);
    } catch {
      // skip an unreadable/corrupt snapshot
    }
  }
  return map;
}

// "14d" / "30d" → number of days; "all" → "all"; anything else → default 14.
export function parseRange(raw: string | null): number | "all" {
  if (!raw) return 14;
  if (raw === "all") return "all";
  const m = raw.match(/^(\d+)d$/);
  if (m) {
    const n = Number(m[1]);
    if (n > 0 && n <= 3650) return n;
  }
  return 14;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Inclusive list of YYYY-MM-DD from `start` to `end` (UTC).
function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  let t = Date.parse(start + "T00:00:00Z");
  const last = Date.parse(end + "T00:00:00Z");
  while (t <= last) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return out;
}

export function buildSeries(rangeRaw: string | null): {
  range: string;
  points: SeriesPoint[];
  missing: string[];
} {
  const range = parseRange(rangeRaw);
  const snapshots = loadSnapshots();
  const today = todayUtc();

  let dates: string[];
  if (range === "all") {
    const keys = [...snapshots.keys()].sort();
    dates = keys.length ? dateRange(keys[0], today) : [];
  } else {
    const startMs = Date.parse(today + "T00:00:00Z") - (range - 1) * 86_400_000;
    dates = dateRange(new Date(startMs).toISOString().slice(0, 10), today);
  }

  const points: SeriesPoint[] = [];
  const missing: string[] = [];
  for (const date of dates) {
    const snap = snapshots.get(date);
    if (snap) {
      points.push({ present: true, ...snap });
    } else {
      points.push({ date, present: false, total: null });
      missing.push(date);
    }
  }

  return { range: range === "all" ? "all" : `${range}d`, points, missing };
}
