#!/usr/bin/env node
// Compares two data/endpoints.json catalogs and prints what changed.
//
//   node scripts/compare-catalogs.mjs <baseline.json> <candidate.json>
//
// Written for the "did removing the 20,000-row cap actually surface more?"
// check, but it is a general before/after diff: totals, per-source
// fetch_report, and the hosts that gained the most endpoints.
//
// Dependency-free Node ESM. Also appends the same summary to
// $GITHUB_STEP_SUMMARY when running in Actions.

import { readFileSync, appendFileSync, statSync } from "node:fs";

const [, , baselinePath, candidatePath] = process.argv;
if (!baselinePath || !candidatePath) {
  console.error(
    "usage: node scripts/compare-catalogs.mjs <baseline.json> <candidate.json>",
  );
  process.exit(2);
}

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const mb = (p) => (statSync(p).size / 1048576).toFixed(2);

const base = read(baselinePath);
const cand = read(candidatePath);

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function byHost(endpoints) {
  const m = new Map();
  for (const e of endpoints) {
    const h = hostOf(e.url);
    m.set(h, (m.get(h) ?? 0) + 1);
  }
  return m;
}

function bySource(endpoints) {
  const m = new Map();
  for (const e of endpoints) {
    for (const s of e.source ?? []) m.set(s, (m.get(s) ?? 0) + 1);
  }
  return m;
}

const out = [];
const say = (line = "") => {
  out.push(line);
  console.log(line);
};

say("## Full-fetch verification");
say();
say(`baseline:  ${baselinePath} — ${base.count} endpoints, ${mb(baselinePath)} MB`);
say(`candidate: ${candidatePath} — ${cand.count} endpoints, ${mb(candidatePath)} MB`);
say();

// ── fetch_report, side by side ──
say("### fetch_report (candidate)");
say();
say("| source | status | rows | count | unique | pages | truncated | api_total | stopped | elapsed |");
say("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of cand.fetch_report ?? []) {
  const secs = r.elapsed_ms != null ? `${(r.elapsed_ms / 1000).toFixed(0)}s` : "";
  say(
    `| ${r.source} | ${r.status} | ${r.rows ?? ""} | ${r.count} | ` +
      `${r.unique_after_dedup ?? ""} | ${r.pages ?? ""} | ` +
      `${r.truncated == null ? "" : r.truncated} | ${r.api_total ?? ""} | ` +
      `${r.stopped_reason ?? ""} | ${secs} |`,
  );
}
say();

const scan = (cand.fetch_report ?? []).find((r) => r.source === "x402scan");
if (scan?.slices?.length) {
  say("### x402scan slices");
  say();
  say("| slice | rows | added | pages |");
  say("| --- | --- | --- | --- |");
  for (const s of scan.slices) {
    say(`| ${s.label} | ${s.rows} | ${s.added} | ${s.pages} |`);
  }
  say();
}

// ── Totals ──
const baseSrc = bySource(base.endpoints);
const candSrc = bySource(cand.endpoints);
say("### Endpoints by source");
say();
say("| source | before | after | delta |");
say("| --- | --- | --- | --- |");
for (const s of new Set([...baseSrc.keys(), ...candSrc.keys()])) {
  const b = baseSrc.get(s) ?? 0;
  const c = candSrc.get(s) ?? 0;
  say(`| ${s} | ${b} | ${c} | ${c - b >= 0 ? "+" : ""}${c - b} |`);
}
say();
say(
  `**Total endpoints: ${base.count} → ${cand.count} ` +
    `(${cand.count - base.count >= 0 ? "+" : ""}${cand.count - base.count})**`,
);
say();

// ── Hosts that the cap was hiding ──
const bh = byHost(base.endpoints);
const ch = byHost(cand.endpoints);
const movers = [...ch.entries()]
  .map(([host, after]) => {
    const before = bh.get(host) ?? 0;
    return { host, before, after, delta: after - before };
  })
  .filter((r) => r.delta > 0)
  .sort((a, b) => b.delta - a.delta);

say(`### Top 20 hosts gained (of ${movers.length} hosts with more endpoints)`);
say();
say("| # | host | before | after | gained | new host |");
say("| --- | --- | --- | --- | --- | --- |");
movers.slice(0, 20).forEach((r, i) => {
  say(
    `| ${i + 1} | ${r.host} | ${r.before} | ${r.after} | +${r.delta} | ${r.before === 0 ? "yes" : ""} |`,
  );
});
say();
say(
  `hosts: ${bh.size} → ${ch.size} (+${ch.size - bh.size}); ` +
    `brand-new hosts: ${movers.filter((r) => r.before === 0).length}`,
);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join("\n") + "\n");
}
