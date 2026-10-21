#!/usr/bin/env bun
// What are you building? — reads a pitch transcript, has Claude grade it against the rubric, computes the score
// in code and writes an HTML report plus the standard output envelope (JSON).
//
// Usage: bun src/score.ts <transcript.txt> [--out <folder>, default: transcript folder] [--model <id>] [--force]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { checkInput, cleanTranscript } from "./lib";
import { DEFAULT_MODEL, gradeTranscript } from "./grade";
import { AGENT_VERSION, CONTRACT, PROMPT_VERSION, finalize, rubric } from "./portable";

const ROOT = resolve(dirname(import.meta.path), "..");
const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const input = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
// Reports are saved next to the transcript unless --out says otherwise
const outDir = resolve(opt("out", input ? dirname(resolve(input)) : "."));
const model = opt("model", DEFAULT_MODEL);
const force = args.includes("--force");

function finish(envelope: object, code: number): never {
  console.log(JSON.stringify(envelope, null, 2));
  process.exit(code);
}

if (!input || !existsSync(input)) {
  finish({ status: "rejected", exit_reason: "error", error: { code: "no_input", message: "Usage: bun src/score.ts <transcript.txt>", retryable: false } }, 2);
}

const transcript = cleanTranscript(readFileSync(input, "utf8"));
const hash = createHash("sha256").update(transcript).digest("hex").slice(0, 12);
const requestId = `ip-${hash}`;
const versions = { agent: AGENT_VERSION, prompt: PROMPT_VERSION, model, contract: CONTRACT, rubric: rubric.rubric_version };

// Input DQ
const inputFails = checkInput(transcript);
if (inputFails.length) {
  finish({ request_id: requestId, status: "rejected", exit_reason: "error", flags: inputFails, dq: { input: "failed" }, versions }, 1);
}

// Duplicate check: same transcript + same versions = same report, unless --force
mkdirSync(outDir, { recursive: true });
const stem = `${basename(input).replace(/\.[^.]+$/, "")}-${hash}`;
const htmlPath = join(outDir, `${stem}.html`);
const jsonPath = join(outDir, `${stem}.json`);
if (!force && existsSync(jsonPath)) {
  const cached = JSON.parse(readFileSync(jsonPath, "utf8"));
  const same = ["agent", "prompt", "model", "rubric"].every((k) => cached.versions?.[k] === (versions as Record<string, string>)[k]);
  if (same) {
    console.error(`Already scored (same transcript and versions). Report: ${htmlPath}  (use --force to re-score)`);
    finish(cached, 0);
  }
  console.error("Scored before with a different agent, prompt, rubric or model version; re-scoring.");
}

const graded = await gradeTranscript(transcript, model);
if (!graded.ok) {
  const { budgetHit, error, cost } = graded;
  finish({ request_id: requestId, status: "failed", exit_reason: budgetHit ? "budget" : "error", error: { code: budgetHit ? "budget_exceeded" : "grading_failed", message: error, retryable: !budgetHit }, metrics: { cost }, versions }, 1);
}

const { raw, ms, cost } = graded;
const out = finalize({ grading: raw, transcript, source: basename(input), model, hash });
if (!out.ok) finish({ request_id: requestId, ...out.envelope }, 1);
writeFileSync(htmlPath, out.html);
const envelope = {
  request_id: requestId,
  ...out.envelope,
  result: { ...out.envelope.result, report_path: htmlPath },
  metrics: { cost_usd: Math.round(cost * 10000) / 10000, latency_ms: ms },
};
writeFileSync(jsonPath, JSON.stringify(envelope, null, 2));
console.error(`
${out.envelope.result.company_name}: ${out.envelope.result.total_score}% (${out.envelope.result.band})
Report: ${htmlPath}`);
finish(envelope, 0);
