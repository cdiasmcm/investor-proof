import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkGrading, checkInput, cleanTranscript, isGrounded, normalize, score, type Grading, type Rubric } from "./lib";

const rubric: Rubric = JSON.parse(readFileSync(join(import.meta.dir, "..", "rubric", "rubric.json"), "utf8"));
const transcript = "We interviewed 25 pharmacists and 155 patients. Our ask is $650,000 to reach break-even in 25 months. ".repeat(10);

const grading = (level: number, evidence = ["Our ask is $650,000 to reach break-even in 25 months"]): Grading => ({
  is_pitch: true, company_name: "Test Co", summary: "s", strengths: [], red_flags: [], flags: [],
  criteria: rubric.criteria.map((c) => ({ id: c.id, level, rationale: "r", evidence, action: "a" })),
});

test("rubric weights sum to 100", () => {
  expect(rubric.criteria.reduce((a, c) => a + c.weight, 0)).toBe(100);
});

test("perfect pitch scores 100, empty pitch scores 0", () => {
  expect(score(grading(4), rubric, transcript).total).toBe(100);
  expect(score(grading(0, []), rubric, transcript).total).toBe(0);
});

test("all level 2 scores 50", () => {
  expect(score(grading(2), rubric, transcript).total).toBe(50);
});

test("ungrounded evidence caps a criterion at level 1", () => {
  const s = score(grading(4, ["we have ten thousand paying customers already"]), rubric, transcript);
  expect(s.criteria.every((c) => c.level === 1)).toBe(true);
  expect(s.total).toBe(25);
  expect(s.flags.some((f) => f.startsWith("ungrounded_C01"))).toBe(true);
});

test("not a pitch scores 0", () => {
  const g = grading(4); g.is_pitch = false;
  expect(score(g, rubric, transcript).total).toBe(0);
});

test("must-haves are 3 to 5, the biggest point losses first", () => {
  const s = score(grading(2), rubric, transcript);
  const must = s.criteria.filter((c) => c.must_have);
  expect(must.length).toBeGreaterThanOrEqual(3);
  expect(must.length).toBeLessThanOrEqual(5);
  expect(must.map((c) => c.id)).toContain("C04");
  expect(must.map((c) => c.id)).toContain("C08");
});

test("grounding tolerates punctuation and small transcription differences", () => {
  const n = normalize(transcript);
  expect(isGrounded("our ask is $650,000 — to reach break-even in 25 months!", n)).toBe(true);
  expect(isGrounded("We interviewed 25 pharmacists and 155 patients", n)).toBe(true);
  expect(isGrounded("we interviewed 25 pharmacists and also 155 patients", n)).toBe(true);
  expect(isGrounded("we signed three letters of intent", n)).toBe(false);
});

test("input checks reject short text and strip subtitle timings", () => {
  expect(checkInput("hello there").length).toBe(1);
  expect(cleanTranscript("1\n00:00:01,000 --> 00:00:03,000\nHello investors")).toBe("Hello investors");
});

test("output DQ catches missing criteria and bad levels", () => {
  const g = grading(2); g.criteria.pop(); g.criteria[0].level = 7;
  const f = checkGrading(g, rubric);
  expect(f.some((x) => x.includes("C13"))).toBe(true);
  expect(f.some((x) => x.includes("level out of range"))).toBe(true);
});

test("red flags keep only quotes said in the transcript", () => {
  const g = grading(2);
  g.red_flags = [
    { issue: "real quote", quotes: ["Our ask is $650,000 to reach break-even in 25 months", "we raised ten million last year"] },
    { issue: "invented quote only", quotes: ["our churn is ninety percent every month"] },
    { issue: "absence: no exit discussed", quotes: [] },
  ];
  const s = score(g, rubric, transcript);
  expect(s.red_flags.map((r) => r.issue)).toEqual(["real quote", "absence: no exit discussed"]);
  expect(s.red_flags[0].quotes).toHaveLength(1);
  expect(s.flags.some((f) => f.startsWith("ungrounded_red_flag:"))).toBe(true);
  expect(s.flags.some((f) => f.startsWith("ungrounded_red_flag_quote"))).toBe(true);
});
