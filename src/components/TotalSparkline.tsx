"use client";

import { useEffect, useState } from "react";

type Point = { date: string; present: boolean; total: number | null };

const W = 260;
const H = 44;
const PAD = 4;

// Split into contiguous segments of present points so missing days render as
// gaps rather than interpolated lines.
function segments(points: { x: number; y: number | null }[]) {
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  for (const p of points) {
    if (p.y == null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else {
      cur.push({ x: p.x, y: p.y });
    }
  }
  if (cur.length) segs.push(cur);
  return segs;
}

export function TotalSparkline() {
  const [points, setPoints] = useState<Point[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/stats?range=30d", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (alive) setPoints(Array.isArray(d.points) ? d.points : []);
      })
      .catch(() => {
        if (alive) setPoints([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!points || points.length === 0) return null;

  const totals = points
    .filter((p) => p.present && typeof p.total === "number")
    .map((p) => p.total as number);
  if (totals.length === 0) return null;

  const latest = totals[totals.length - 1];
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const span = max - min || 1;
  const n = points.length;

  const scaled = points.map((p, i) => ({
    x: PAD + (i / Math.max(1, n - 1)) * (W - 2 * PAD),
    y:
      p.present && typeof p.total === "number"
        ? H - PAD - ((p.total - min) / span) * (H - 2 * PAD)
        : null,
  }));

  const segs = segments(scaled);
  const presentDates = points.filter((p) => p.present).map((p) => p.date);
  const first = presentDates[0];
  const last = presentDates[presentDates.length - 1];

  return (
    <div className="flex items-center gap-3 text-accent">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="overflow-visible"
        role="img"
        aria-label={`Total endpoints over time, latest ${latest}`}
      >
        {segs.map((seg, i) =>
          seg.length === 1 ? (
            <circle key={i} cx={seg[0].x} cy={seg[0].y} r={1.5} fill="currentColor" />
          ) : (
            <polyline
              key={i}
              points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ),
        )}
      </svg>
      <div className="text-xs text-muted leading-tight">
        <div className="text-white font-medium">
          {latest.toLocaleString()} endpoints
        </div>
        <div>
          {first === last ? first : `${first} → ${last}`}
        </div>
      </div>
    </div>
  );
}
