#!/usr/bin/env bun
// CI gate (no model calls, no API key): the committed evals/results.json must be current for this code and passing.
// "Current" means its fingerprint matches every file that can change a score (see fingerprintFiles in eval-lib.ts).
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { type Results, RESULTS_PATH, RESULTS_SCHEMA, checkCase, fingerprint, loadCases } from "./eval-lib";

const problems: string[] = [];
const cases = loadCases();
let res: Results | undefined;

if (!existsSync(RESULTS_PATH)) problems.push("evals/results.json is missing: run `bun run eval` and commit evals/results.json");
else res = JSON.parse(readFileSync(RESULTS_PATH, "utf8"));

if (res) {
  if (res.schema !== RESULTS_SCHEMA) problems.push(`unknown results schema "${res.schema}"`);
  const fp = fingerprint(cases);
  if (res.fingerprint !== fp.hash) problems.push("eval results are stale: prompts, rubric, scoring code or cases changed since they were produced. Run `bun run eval` and commit evals/results.json");
  if (!cases.allowed_models.includes(res.model)) problems.push(`results were produced with ${res.model}; allowed: ${cases.allowed_models.join(", ")}`);
  for (const c of cases.cases) {
    const r = res.cases.find((x) => x.id === c.id);
    if (!r) { problems.push(`${c.id}: no result`); continue; }
    if (r.error || !r.outcome) { problems.push(`${c.id}${c.critical ? " (critical)" : ""}: run failed: ${r.error ?? "no outcome"}`); continue; }
    // Re-check from the recorded outcome with the current expectations, instead of trusting the stored pass/fail
    const failed = checkCase(c, r.outcome).filter((k) => !k.pass);
    for (const k of failed) problems.push(`${c.id}${c.critical ? " (critical)" : ""}: ${k.name} failed (${k.detail})`);
  }
}

const ok = problems.length === 0;
const summary = ok
  ? `Eval results are current and passing: ${res!.summary.cases} cases on ${res!.model} (${res!.date}).`
  : `Eval results check failed:\n${problems.map((p) => `- ${p}`).join("\n")}`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Eval results\n\n${summary}\n`);
process.exit(ok ? 0 : 1);
