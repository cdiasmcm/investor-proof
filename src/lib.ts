// Pure, deterministic logic: input checks, grounding, scoring. No model calls here (unit-tested).

export type Criterion = { id: string; name: string; weight: number; perfect: string[]; common_gaps: string[] };
export type Rubric = {
  rubric_version: string;
  scale: { level_to_fraction: Record<string, number> };
  criteria: Criterion[];
  not_scored_from_transcript: string[];
};

export type GradedCriterion = { id: string; level: number; rationale: string; evidence: string[]; action: string };
export type Grading = {
  is_pitch: boolean;
  company_name: string;
  summary: string;
  criteria: GradedCriterion[];
  strengths: string[];
  red_flags: { issue: string; quotes: string[] }[];
  flags: string[];
};

export type ScoredCriterion = GradedCriterion & {
  name: string;
  weight: number;
  points: number;
  points_lost: number;
  grounded_evidence: string[];
  must_have: boolean;
};

export const MIN_WORDS = 150;
export const MAX_WORDS = 25000;

export const BANDS: { min: number; label: string; meaning: string }[] = [
  { min: 85, label: "Investor-ready", meaning: "Fund-worthy story; polish only" },
  { min: 70, label: "Strong", meaning: "Credible pitch with a few gaps an investor will probe" },
  { min: 55, label: "Promising", meaning: "Good bones; key proof points missing" },
  { min: 40, label: "Weak", meaning: "Several core sections thin or unproven" },
  { min: 0, label: "Not ready", meaning: "Major sections missing" },
];

/** Strip subtitle timing lines (SRT/VTT) and collapse whitespace. */
export function cleanTranscript(raw: string): string {
  return raw
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => !/^WEBVTT/.test(l) && !/^\d+$/.test(l.trim()) && !/-->/.test(l))
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/** Input DQ: returns a list of failures (empty = OK). */
export function checkInput(text: string): string[] {
  const fails: string[] = [];
  const n = wordCount(text);
  if (n < MIN_WORDS) fails.push(`too_short: ${n} words, need at least ${MIN_WORDS}`);
  if (n > MAX_WORDS) fails.push(`too_long: ${n} words, max ${MAX_WORDS}`);
  if (text.includes("�")) fails.push("encoding: undecodable characters found; save the transcript as UTF-8");
  return fails;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9$% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A quote is grounded if it appears in the transcript (exact after normalising), or if 85%+ of its
 *  words appear in the same order within a window (tolerates small transcription differences). */
export function isGrounded(quote: string, normTranscript: string): boolean {
  const q = normalize(quote);
  if (!q) return false;
  if (normTranscript.includes(q)) return true;
  const qw = q.split(" ");
  if (qw.length < 4) return false;
  const tw = normTranscript.split(" ");
  const first = new Set(qw.slice(0, 3));
  for (let i = 0; i < tw.length; i++) {
    if (!first.has(tw[i])) continue;
    let hit = 0, j = i;
    for (const w of qw) {
      const k = tw.indexOf(w, j);
      if (k !== -1 && k - j <= 3) { hit++; j = k + 1; }
    }
    if (hit / qw.length >= 0.85) return true;
  }
  return false;
}

/** Output DQ on the model's grading. Returns failures (empty = OK). */
export function checkGrading(g: Grading, rubric: Rubric): string[] {
  const fails: string[] = [];
  const ids = rubric.criteria.map((c) => c.id);
  const seen = g.criteria?.map((c) => c.id) ?? [];
  for (const id of ids) if (seen.filter((s) => s === id).length !== 1) fails.push(`criterion ${id} missing or duplicated`);
  for (const c of g.criteria ?? []) {
    if (!ids.includes(c.id)) fails.push(`unknown criterion ${c.id}`);
    if (!Number.isInteger(c.level) || c.level < 0 || c.level > 4) fails.push(`${c.id} level out of range`);
  }
  return fails;
}

/** Deterministic scoring. Ungrounded evidence caps a criterion at level 1. */
export function score(g: Grading, rubric: Rubric, transcript: string) {
  const norm = normalize(transcript);
  const flags = [...(g.flags ?? [])];
  const scored: ScoredCriterion[] = rubric.criteria.map((rc) => {
    const gc = g.criteria.find((c) => c.id === rc.id)!;
    const grounded = (gc.evidence ?? []).filter((q) => isGrounded(q, norm));
    let level = g.is_pitch ? gc.level : 0;
    if (level > 1 && grounded.length === 0) {
      flags.push(`ungrounded_${rc.id}: no quote found in transcript, capped at level 1`);
      level = 1;
    }
    const frac = rubric.scale.level_to_fraction[String(level)];
    const points = Math.round(rc.weight * frac * 100) / 100;
    return {
      ...gc, level, name: rc.name, weight: rc.weight, points,
      points_lost: Math.round((rc.weight - points) * 100) / 100,
      grounded_evidence: grounded, must_have: false,
    };
  });

  // Must-haves: the criteria losing the most points (3 to 5, only those losing at least 2 points).
  const ranked = scored.filter((s) => s.points_lost > 0).sort((a, b) => b.points_lost - a.points_lost);
  ranked.forEach((s, i) => { if (i < 3 || (i < 5 && s.points_lost >= 2)) s.must_have = true; });

  const total = Math.round(scored.reduce((a, s) => a + s.points, 0));
  const band = BANDS.find((b) => total >= b.min)!;
  const red_flags = groundRedFlags(g.red_flags ?? [], norm, flags);
  return { total, band, criteria: scored, red_flags, flags };
}

/** Red flags may only quote what was said. Ungrounded quotes are dropped; a flag whose quotes are all
 *  ungrounded is dropped. A flag with no quotes (an absence, e.g. "no ask") is kept. */
export function groundRedFlags(redFlags: Grading["red_flags"], norm: string, flags: string[]): Grading["red_flags"] {
  const kept: Grading["red_flags"] = [];
  for (const r of redFlags) {
    const quotes = r.quotes ?? [];
    const grounded = quotes.filter((q) => isGrounded(q, norm));
    if (quotes.length && !grounded.length) {
      flags.push(`ungrounded_red_flag: dropped "${r.issue.slice(0, 60)}"`);
      continue;
    }
    if (grounded.length < quotes.length) flags.push(`ungrounded_red_flag_quote: ${quotes.length - grounded.length} quote(s) removed`);
    kept.push({ issue: r.issue, quotes: grounded });
  }
  return kept;
}
