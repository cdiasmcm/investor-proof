#!/usr/bin/env bun
// CI gate (no model calls, no API key): the committed evals/results.json must be current for this code and passing.
// "Current" means its fingerprint matches every file that can change a score (see fingerprintFiles in eval-lib.ts).
// On failure it tells the contributor exactly what to do, in the log, as GitHub annotations and in the job summary.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { type Case, type Check, type Outcome, type Results, RESULTS_PATH, RESULTS_SCHEMA, checkCase, fingerprint, fingerprintFiles, loadCases } from "./eval-lib";

type Problem = { kind: "missing" | "stale" | "model" | "case"; text: string };
const problems: Problem[] = [];
const cases = loadCases();
let res: Results | undefined;

/** Plain-language reason for one failed check, e.g. "S002 scored 23, expected 0–15." */
function describe(c: Case, o: Outcome, k: Check): string {
  const id = `${c.id}${c.critical ? " (critical case)" : ""}`;
  const e = c.expect;
  if (k.name === "total" && e.total) return `${id} scored ${o.total}, expected ${e.total[0]}–${e.total[1]}.`;
  if (k.name.startsWith("level ")) {
    const crit = k.name.slice(6);
    const rule = (e.levels ?? {})[crit] ?? "";
    const want = rule.replace(/^==\s*/, "exactly ").replace(/^>=\s*/, "at least ").replace(/^<=\s*/, "at most ").replace(/^>\s*/, "above ").replace(/^<\s*/, "below ");
    return `${id}: criterion ${crit} is at level ${o.levels[crit] ?? "?"}, expected ${want}.`;
  }
  if (k.name.startsWith("must-have ")) return `${id}: ${k.name.slice(10)} should be one of the must-have actions, but they were ${o.must_haves.join(", ") || "none"}.`;
  if (k.name.startsWith("flag ")) return `${id}: the "${k.name.slice(5)}" flag was not raised.`;
  if (k.name === "red flags") return `${id} found ${o.red_flags} red flag(s), expected at least ${e.red_flags_min}.`;
  return `${id}: ${k.name} failed (${k.detail}).`;
}

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
    if (r.error || !r.outcome) { problems.push({ kind: "case", text: `${c.id}${c.critical ? " (critical case)" : ""}: the eval run failed: ${r.error ?? "no outcome"}.` }); continue; }
    // Re-check from the recorded outcome with the current expectations, instead of trusting the stored pass/fail
    for (const k of checkCase(c, r.outcome).filter((k) => !k.pass)) problems.push({ kind: "case", text: describe(c, r.outcome, k) });
  }
}

// Results missing or out of date: the contributor needs to run the evals.
const HOW_TO_FIX = [
  "One-time setup: install Bun (https://bun.sh) and the Claude Code CLI, then sign in by running `claude` once.",
  "In your branch, run: `bun install && bun test && bun run eval`",
  "`bun run eval` scores every case in evals/cases.json on your own model account (about US$0.40 for the current cases) and rewrites evals/results.json and evals/RESULTS.md.",
  "If it reports a FAIL, your change moved a score outside its expected range: see CONTRIBUTING.md, section \"If an eval case fails\".",
  "Commit and push the results: `git add evals/results.json evals/RESULTS.md && git commit -m \"Update eval results\" && git push`",
  "Full guide: CONTRIBUTING.md",
];
// Results current but a case misses its expectation: re-running won't help, the change or the expectation must change.
const HOW_TO_FIX_CASES = [
  "Your evals ran on the current code, and a score landed outside its expected range (see Why). Running them again won't change that.",
  "Either fix the change that moved the score (prompt, rubric or scoring code), then run `bun run eval` and commit evals/results.json and evals/RESULTS.md,",
  "or, if the expected range itself is wrong, change it in evals/cases.json and explain in the PR description why the new expectation is right. The maintainer reviews every expectation change.",
  "Full guide: CONTRIBUTING.md, section \"If an eval case fails\"",
];

const ok = problems.length === 0;
const onlyCaseFailures = problems.every((p) => p.kind === "case");
const headline = onlyCaseFailures
  ? "Eval cases are failing: a score is outside its expected range."
  : "Eval results need to be re-run on your machine before this PR can merge.";
const steps = onlyCaseFailures ? HOW_TO_FIX_CASES : HOW_TO_FIX;
const fixLine = onlyCaseFailures
  ? "Fix: change what moved the score, or justify a new expected range in evals/cases.json and the PR. Running the evals again alone won't pass this check."
  : "Fix: run `bun run eval` on your machine and commit evals/results.json. See the job summary or CONTRIBUTING.md.";
const numbered = (prefix: string) => steps.map((s, i) => `${prefix}${i + 1}. ${s}`).join("\n");
// GitHub annotation text: newlines and % must be escaped
const esc = (s: string) => s.replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");

if (ok) {
  console.log(`Eval results are current and passing: ${res!.summary.cases} cases on ${res!.model} (${res!.date}).`);
} else {
  console.log(`\n✗ ${headline}\n\nWhy:\n${problems.map((p) => `  - ${p.text}`).join("\n")}\n\nHow to fix:\n${numbered("  ")}\n`);
  if (!onlyCaseFailures) console.log(`Files that make the results out of date when changed:\n${fingerprintFiles(cases).map((f) => `  ${f}`).join("\n")}\n`);
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error title=${esc(headline)}::${esc(`${problems.map((p) => p.text).join("\n")}\n\n${fixLine}`)}`);
    console.log(`::notice title=How to pass eval-results::${esc(numbered(""))}`);
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const body = ok
    ? `✅ Eval results are current and passing: ${res!.summary.cases} cases on ${res!.model} (${res!.date}).`
    : `### ❌ ${headline}\n\n**Why**\n\n${problems.map((p) => `- ${p.text}`).join("\n")}\n\n**How to fix**\n\n${numbered("")}\n\nEvals run on your own model account, so the project costs the maintainer nothing to keep honest. Docs-only changes never need a new eval run.`;
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Eval results\n\n${body}\n`);
}
process.exit(ok ? 0 : 1);
