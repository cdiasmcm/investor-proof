#!/usr/bin/env bun
// CI gate (no model calls, no API key): the committed evals/results.json must be current for this code and passing.
// "Current" means its fingerprint matches every file that can change a score (see fingerprintFiles in eval-lib.ts).
// On failure it tells the contributor exactly what to run, in the log, as GitHub annotations and in the job summary.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { type Results, RESULTS_PATH, RESULTS_SCHEMA, checkCase, fingerprint, fingerprintFiles, loadCases } from "./eval-lib";

type Problem = { kind: "missing" | "stale" | "model" | "case"; text: string };
const problems: Problem[] = [];
const cases = loadCases();
let res: Results | undefined;

if (!existsSync(RESULTS_PATH)) problems.push({ kind: "missing", text: "evals/results.json is missing." });
else res = JSON.parse(readFileSync(RESULTS_PATH, "utf8"));

if (res) {
  if (res.schema !== RESULTS_SCHEMA) problems.push({ kind: "stale", text: `evals/results.json has an unknown schema ("${res.schema}").` });
  if (res.fingerprint !== fingerprint(cases).hash) {
    problems.push({ kind: "stale", text: "evals/results.json is out of date: this PR changes files that can affect scores (prompts, rubric, scoring code, eval scripts or cases), and the evals were not re-run after that change." });
  }
  if (!cases.allowed_models.includes(res.model)) problems.push({ kind: "model", text: `The results were produced with ${res.model}; allowed models: ${cases.allowed_models.join(", ")}.` });
  for (const c of cases.cases) {
    const r = res.cases.find((x) => x.id === c.id);
    if (!r) { problems.push({ kind: "stale", text: `${c.id} has no result.` }); continue; }
    if (r.error || !r.outcome) { problems.push({ kind: "case", text: `${c.id}${c.critical ? " (critical)" : ""}: the run failed: ${r.error ?? "no outcome"}.` }); continue; }
    // Re-check from the recorded outcome with the current expectations, instead of trusting the stored pass/fail
    for (const k of checkCase(c, r.outcome).filter((k) => !k.pass)) {
      problems.push({ kind: "case", text: `${c.id}${c.critical ? " (critical)" : ""}: ${k.name} missed its expected result (${k.detail}).` });
    }
  }
}

const HOW_TO_FIX = [
  "One-time setup: install Bun (https://bun.sh) and the Claude Code CLI, then sign in by running `claude` once.",
  "In your branch, run: `bun install && bun test && bun run eval`",
  "`bun run eval` scores every case in evals/cases.json on your own model account (about US$0.40 for the current cases) and rewrites evals/results.json and evals/RESULTS.md.",
  "If it reports a FAIL, your change made a score worse: fix the change (or, if the expectation itself is wrong, update evals/cases.json and explain why in the PR), then run it again.",
  "Commit and push the results: `git add evals/results.json evals/RESULTS.md && git commit -m \"Update eval results\" && git push`",
  "Full guide: CONTRIBUTING.md",
];

const ok = problems.length === 0;
const onlyCaseFailures = problems.every((p) => p.kind === "case");
const headline = onlyCaseFailures
  ? "Eval cases are failing: this change makes at least one expected score worse."
  : "Eval results need to be re-run on your machine before this PR can merge.";
// GitHub annotation text: newlines and % must be escaped
const esc = (s: string) => s.replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");

if (ok) {
  console.log(`Eval results are current and passing: ${res!.summary.cases} cases on ${res!.model} (${res!.date}).`);
} else {
  console.log(`\n✗ ${headline}\n\nWhy:\n${problems.map((p) => `  - ${p.text}`).join("\n")}\n\nHow to fix (on your machine):\n${HOW_TO_FIX.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}\n`);
  console.log(`Files that make the results out of date when changed:\n${fingerprintFiles(cases).map((f) => `  ${f}`).join("\n")}\n`);
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error title=${esc(headline)}::${esc(`${problems.map((p) => p.text).join("\n")}\n\nFix: run \`bun run eval\` on your machine and commit evals/results.json. See the job summary or CONTRIBUTING.md.`)}`);
    console.log(`::notice title=How to pass eval-results::${esc(HOW_TO_FIX.map((s, i) => `${i + 1}. ${s}`).join("\n"))}`);
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const body = ok
    ? `✅ Eval results are current and passing: ${res!.summary.cases} cases on ${res!.model} (${res!.date}).`
    : `### ❌ ${headline}\n\n**Why**\n\n${problems.map((p) => `- ${p.text}`).join("\n")}\n\n**How to fix, on your machine**\n\n${HOW_TO_FIX.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nEvals run on your own model account, so the project costs the maintainer nothing to keep honest. Docs-only changes never need a new eval run.`;
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Eval results\n\n${body}\n`);
}
process.exit(ok ? 0 : 1);
