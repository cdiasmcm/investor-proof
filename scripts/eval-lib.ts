// Shared by scripts/eval.ts (runs the cases) and scripts/eval-check.ts (CI: checks the committed results).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const ROOT = join(import.meta.dir, "..");
export const CASES_PATH = join(ROOT, "evals", "cases.json");
export const RESULTS_PATH = join(ROOT, "evals", "results.json");
export const RESULTS_MD_PATH = join(ROOT, "evals", "RESULTS.md");
export const RESULTS_SCHEMA = "eval-results v1";

export type Expect = {
  total?: [number, number];
  levels?: Record<string, string>; // e.g. { "C04": "==0", "C01": ">=3" }
  must_haves?: string[];
  flags?: string[];
  red_flags_min?: number;
};
export type Case = { id: string; input: string; summary?: string; failure_modes?: string[]; critical: boolean; expect: Expect };
export type CaseFile = { allowed_models: string[]; cases: Case[] };
export type Check = { name: string; pass: boolean; detail: string };
export type Outcome = { total: number; band: string; levels: Record<string, number>; must_haves: string[]; flags: string[]; red_flags: number };
export type CaseResult = { id: string; critical: boolean; pass: boolean; checks: Check[]; outcome?: Outcome; error?: string; cost_usd: number };
export type Results = {
  schema: string; fingerprint: string; fingerprint_files: number; model: string;
  versions: { agent: string; prompt: string; rubric: string }; date: string; cost_usd: number;
  summary: { cases: number; passed: number; failed: number; critical_failed: number }; cases: CaseResult[];
};

export const loadCases = (): CaseFile => JSON.parse(readFileSync(CASES_PATH, "utf8"));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** Every file that can change a score: prompts, rubric, scoring/report code, the eval logic, the cases and their transcripts. */
export function fingerprintFiles(cases: CaseFile): string[] {
  const files = [
    ...walk(join(ROOT, "prompt")),
    ...walk(join(ROOT, "rubric")),
    ...walk(join(ROOT, "src")).filter((p) => p.endsWith(".ts") && !p.endsWith(".test.ts")),
    join(ROOT, "scripts", "html-prompt.ts"),
    join(ROOT, "scripts", "eval.ts"),
    join(ROOT, "scripts", "eval-lib.ts"),
    CASES_PATH,
    ...cases.cases.map((c) => join(ROOT, c.input)),
  ];
  return [...new Set(files.map((p) => relative(ROOT, p).replace(/\\/g, "/")))].sort();
}

/** SHA-256 over path + content of each file, with line endings normalized so Windows and Linux agree. */
export function fingerprint(cases: CaseFile): { hash: string; files: number } {
  const h = createHash("sha256");
  const files = fingerprintFiles(cases);
  for (const f of files) h.update(`${f}\0${readFileSync(join(ROOT, f), "utf8").replace(/\r\n/g, "\n")}\0`);
  return { hash: h.digest("hex"), files: files.length };
}

function compare(value: number, rule: string): boolean {
  const m = rule.match(/^(==|>=|<=|>|<)\s*(\d+)$/);
  if (!m) throw new Error(`bad level rule "${rule}"`);
  const n = Number(m[2]);
  return { "==": value === n, ">=": value >= n, "<=": value <= n, ">": value > n, "<": value < n }[m[1]]!;
}

/** Checks one case's outcome against its expectations. */
export function checkCase(c: Case, o: Outcome): Check[] {
  const e = c.expect;
  const checks: Check[] = [];
  if (e.total) checks.push({ name: "total", pass: o.total >= e.total[0] && o.total <= e.total[1], detail: `${o.total} in ${e.total[0]}–${e.total[1]}` });
  for (const [id, rule] of Object.entries(e.levels ?? {})) {
    checks.push({ name: `level ${id}`, pass: id in o.levels && compare(o.levels[id], rule), detail: `${id}=${o.levels[id]} ${rule}` });
  }
  for (const id of e.must_haves ?? []) checks.push({ name: `must-have ${id}`, pass: o.must_haves.includes(id), detail: `must-haves: ${o.must_haves.join(", ")}` });
  for (const f of e.flags ?? []) checks.push({ name: `flag ${f}`, pass: o.flags.includes(f), detail: `flags: ${o.flags.join(", ") || "none"}` });
  if (e.red_flags_min !== undefined) checks.push({ name: "red flags", pass: o.red_flags >= e.red_flags_min, detail: `${o.red_flags} ≥ ${e.red_flags_min}` });
  return checks;
}
