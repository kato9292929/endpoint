#!/usr/bin/env node
// Finds work that was reviewed but never reached `main`.
//
//   node scripts/check-unmerged.mjs            # exits 1 if anything is stranded
//
// Why this exists. PR #24 was SQUASH-merged. Squashing collapses a branch into
// one new commit, so git cannot tell that the branch's commits are in `main` —
// and anything pushed to the branch AFTER the merge button is not in `main` at
// all. Three commits were left behind that way and nobody noticed for nine
// days: `main` kept running older code than had been reviewed.
//
// The check compares each merged PR's branch against `head.sha` — the commit
// the branch pointed at WHEN IT WAS MERGED. Anything the branch gained after
// that was never part of the PR and never reached `main`, whatever the merge
// strategy was.
//
// Deliberately NOT "commits not in main": a squash-merged branch that was
// never deleted always looks that way, because squashing rewrites the
// commits. That is normal and silent here — only work pushed after the merge
// is a finding.
//
// Dependency-free Node ESM. Needs GITHUB_TOKEN and a full-history checkout
// (actions/checkout with fetch-depth: 0).

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const REPO = process.env.GITHUB_REPOSITORY ?? "kato9292929/endpoint";
const TOKEN = process.env.GITHUB_TOKEN;
const BASE = process.env.BASE_BRANCH ?? "main";
// Only recent merges. This exists to catch a mistake within a day or two;
// a branch from months ago is archaeology, and a multi-commit squash can no
// longer be matched by patch id anyway.
const WINDOW_DAYS = Number(process.env.UNMERGED_WINDOW_DAYS ?? 30);

function git(...args) {
  // stderr silenced: a missing object is an expected, handled outcome here,
  // not something to print.
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
}

// `gh api` rather than raw fetch: it is present both on the Actions runner and
// in local dev, and carries whichever credential that environment already has,
// so the check is runnable by hand before it is trusted in CI.
async function api(path) {
  try {
    return JSON.parse(
      execFileSync("gh", ["api", path], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, ...(TOKEN ? { GH_TOKEN: TOKEN } : {}) },
      }),
    );
  } catch (err) {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        accept: "application/vnd.github+json",
        ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(
        `gh api ${path} failed (${err?.message}); ` +
          `fetch fallback → HTTP ${res.status}`,
      );
    }
    return res.json();
  }
}

const out = [];
const say = (line = "") => {
  out.push(line);
  console.log(line);
};

async function main() {
  const since = Date.now() - WINDOW_DAYS * 86400_000;
  const prs = await api(
    `/repos/${REPO}/pulls?state=closed&base=${BASE}&per_page=100&sort=updated&direction=desc`,
  );

  // A branch with an OPEN pull request is work in progress, not stranded work.
  const open = await api(
    `/repos/${REPO}/pulls?state=open&per_page=100`,
  );
  const tracked = new Set(open.map((p) => p.head?.ref).filter(Boolean));

  const stranded = new Map(); // branch → finding (one entry per branch)
  for (const pr of prs) {
    if (!pr.merged_at) continue;
    if (Date.parse(pr.merged_at) < since) continue;

    const ref = pr.head?.ref;
    const mergedSha = pr.head?.sha;
    if (!ref || !mergedSha) continue;
    if (tracked.has(ref)) continue; // an open PR already covers this branch

    // Branch already deleted — the usual, and correct, outcome.
    let exists = "";
    try {
      exists = git("ls-remote", "--heads", "origin", ref);
    } catch {
      continue;
    }
    if (!exists) continue;

    // Commits the branch gained AFTER the merge, excluding anything already on
    // `main`. `git cherry` compares by patch id, so a commit that reached
    // `main` through a later squash is recognised and does not count.
    let subjects = [];
    try {
      const after = new Set(
        git("rev-list", `${mergedSha}..origin/${ref}`).split("\n").filter(Boolean),
      );
      if (after.size === 0) continue;
      for (const line of git("cherry", `origin/${BASE}`, `origin/${ref}`).split("\n")) {
        const [mark, sha] = line.split(" ");
        if (mark !== "+" || !after.has(sha)) continue; // "-" = already in main
        subjects.push(git("log", "-1", "--format=%h %s", sha));
      }
    } catch {
      // The merged SHA is not in this checkout (branch force-pushed, or the
      // object was pruned). Cannot assert anything; stay quiet rather than
      // cry wolf.
      continue;
    }
    if (subjects.length === 0) continue;

    const prev = stranded.get(ref);
    if (!prev || Date.parse(pr.merged_at) > Date.parse(prev.pr.merged_at)) {
      stranded.set(ref, { pr, ref, ahead: subjects.length, subjects });
    }
  }

  const findings = [...stranded.values()];
  if (findings.length === 0) {
    say(
      `✓ No merged PR has commits pushed after its merge (last ${WINDOW_DAYS}d, ` +
        `${prs.filter((p) => p.merged_at).length} merged PR(s) checked).`,
    );
    return 0;
  }

  say("## Stranded commits — pushed to a branch after its PR was merged");
  say();
  say(
    `\`${BASE}\` does not contain everything on these branches. Commits pushed ` +
      "after the merge button are in no PR and will never arrive on their own.",
  );
  say();
  for (const s of findings) {
    say(`### #${s.pr.number} — ${s.pr.title}`);
    say();
    say(
      `Branch \`${s.ref}\` gained **${s.ahead} commit(s) after** the PR merged ` +
        `on ${s.pr.merged_at.slice(0, 10)}:`,
    );
    say();
    for (const line of s.subjects) say(`- \`${line}\``);
    say();
    say(
      "Open a follow-up PR for them, or delete the branch if the work is " +
        "genuinely obsolete.",
    );
    say();
  }
  return 1;
}

const code = await main().catch((err) => {
  // A check that cannot run must not look like a pass.
  console.error(`check-unmerged failed: ${err.message}`);
  return 2;
});

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join("\n") + "\n");
}
process.exit(code);
