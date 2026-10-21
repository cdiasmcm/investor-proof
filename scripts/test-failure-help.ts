#!/usr/bin/env bun
// Runs in CI only when `bun test` failed. Reads the saved test log, names each failing test and tells the
// contributor what to do, in the log, as GitHub annotations and in the job summary.
// Usage: bun scripts/test-failure-help.ts <bun-test.log>
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const log = existsSync(process.argv[2] ?? "") ? readFileSync(process.argv[2], "utf8") : "";
const failed = [...new Set([...log.matchAll(/^\(fail\) (.+?)(?: \[[\d.]+ms\])?$/gm)].map((m) => m[1].trim()))];

// Specific advice for tests whose fix is not obvious from the assertion alone
const HINTS: [RegExp, string][] = [
  [/built artifacts are up to date|SYSTEM\.md .*up to date/, "Generated files are out of date. Run `bun run build` and commit dist/, schema/ and prompt/SYSTEM.md."],
  [/locked snapshot/, "The report HTML changed. If that change is intended, run `bun test --update-snapshots`, commit src/__snapshots__/ and explain the layout change in the PR. If not, undo the change to src/render.ts."],
  [/sections appear in the fixed order|same layout whatever the model/, "The report layout must stay identical for every model. Undo the layout change, or discuss it in an issue first."],
  [/published files contain no local paths/, "A published file contains a local path, an email address or a private name. Remove it (the log shows the file and the match)."],
  [/rubric weights sum to 100/, "rubric/rubric.json weights must add up to exactly 100. Rebalance the weights."],
];

const reasons = failed.length ? failed : ["(could not read the failing test names; see the log above)"];
const advice = failed.map((t) => HINTS.find(([re]) => re.test(t))?.[1]).filter((x): x is string => !!x);
const steps = [
  "Run `bun test` on your machine to see the same failure, with the expected and received values.",
  ...[...new Set(advice)],
  "If you changed behaviour on purpose, update the test that covers it and explain why in the PR. Never delete a test to make the check pass.",
  "Commit and push the fix; this check re-runs automatically.",
];
const headline = `Unit tests failed: ${failed.length || "some"} test${failed.length === 1 ? "" : "s"} did not pass.`;
const esc = (s: string) => s.replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
const numbered = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

console.log(`\n✗ ${headline}\n\nWhy (failing tests):\n${reasons.map((r) => `  - ${r}`).join("\n")}\n\nHow to fix:\n${numbered.replace(/^/gm, "  ")}\n`);
if (process.env.GITHUB_ACTIONS) {
  console.log(`::error title=${esc(headline)}::${esc(`Failing: ${reasons.join("; ")}\n\nFix: run \`bun test\` on your machine, fix the code (or the test, if the behaviour change is intended and explained in the PR), then push.`)}`);
  console.log(`::notice title=How to pass unit-tests::${esc(numbered)}`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Unit tests\n\n### ❌ ${headline}\n\n**Why (failing tests)**\n\n${reasons.map((r) => `- ${r}`).join("\n")}\n\n**How to fix**\n\n${numbered}\n\nFull guide: CONTRIBUTING.md\n`);
}
