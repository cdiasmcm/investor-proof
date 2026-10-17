# Agent audit: investorproof

Date: 2026-10-16 | Tier: Lite | Stage: Design | Agent v0.2.1 | Completeness check + judgment review.

| # | Block | Status | One line |
|---|-------|--------|----------|
| 1 | Purpose | PASS | Green Light task, one-sentence job, north-star defined; no baseline yet |
| 2 | Steps | GAPS | Clean single-LLM pipeline; the cost cap is stated but not enforced in code |
| 3 | Input | GAPS | Input checks in code; the duplicate cache ignores agent/rubric version, so stale reports get reused |
| 4 | Output | GAPS | Criterion quotes are grounded in code, but red-flag quotes are shown unchecked |
| 5 | Tools & Access | PASS | Model runs with no tools, MCP or settings (verified: it reports no tools); trifecta broken in code |
| 6 | Controls | PASS | Every "must never" maps to code or a CLI flag |
| 7 | Evals & DQ | GAPS | 0 real golden cases (MVP needs 20); run-to-run variance not measured |
| 8 | Operations | GAPS | Model is the `opus` alias, not a pinned version; scores can drift when the alias moves |

Completeness (`audit-agent.ps1`): all tier fields filled in blocks 1–8; only gap flagged is the empty golden set.

## 1. Purpose: PASS
- **Evidence:** `AGENT.md` §1: job sentence, zone Green, H4, north-star (±10 points vs a human score, target 80%), AI disclosure in every report footer.
- **Gaps:** baseline is "none". Fine for Design; needed before MVP.
- **Tier:** Lite fits while only the owner uses it. If reports go to other founders, their transcripts become third-party data and the tool becomes something people rely on: move to **Standard** at that point.

## 2. Steps: GAPS
- **Evidence:** `AGENT.md` §2 step table (C/L/H tags), one model call, 2-attempt cap, 300 s timeout in `src/score.ts`.
- **Gap:** "max cost ~US$0.50 per run" is a claim; nothing enforces it. The CLI supports `--max-budget-usd`, which isn't passed. Prompts steer, code enforces.

## 3. Input: GAPS
- **Evidence:** `checkInput` (150–25,000 words, encoding), `cleanTranscript` (subtitle timings), sha256 duplicate key; transcript marked untrusted.
- **Gap:** the duplicate check keys on the transcript hash only (`score.ts`, `existsSync(jsonPath)`). After a rubric, prompt or model change, a re-run silently returns the old report unless `--force` is used. The key should include agent, prompt and rubric versions.

## 4. Output: GAPS
- **Evidence:** JSON-schema output, `checkGrading` (ids, level range), `isGrounded` caps ungrounded criteria at level 1, score computed in code, unit tests (9) for the math.
- **Gap:** `red_flags[].quotes` and `strengths` reach the HTML without any grounding check (`score.ts` passes `g.red_flags` straight to `renderHtml`). An invented quote in a red flag would be shown to the founder as something they said. Filter red-flag quotes through `isGrounded` (drop or mark ungrounded ones).

## 5. Tools & Access: PASS
- **Evidence:** `claude -p --tools "" --strict-mcp-config --setting-sources ""`; verified 2026-10-16 that the model reports no available tools. Writes only new files beside the transcript; hash-based idempotency; no stored credentials.
- **Note:** the transcript is sent to the model provider; README states it.

## 6. Controls: PASS
- **Evidence:** `AGENT.md` §6 maps each "must never" to code: total computed by code, quote grounding, no tools, hash filenames + `--force`, `is_pitch: false` forces zeros. Injection case S003 is marked critical and passes (flag raised, 39%).
- **Watch:** the "never follow transcript instructions" rule is enforced by having no tools plus schema output; the score itself can still be nudged by persuasive text. S003 covers one pattern; add more injection variants as cases grow.

## 7. Evals & DQ: GAPS (blocking for MVP)
- **Evidence:** `evals/EVAL-PLAN.md` (6 failure modes, SC1/SC2/SC5 testable yes/no criteria), `evals/GOLDEN-SET.md` (3 fictional S-cases, all within expected ranges), 10 tests incl. a publish guard.
- **Gaps:** 0 real golden cases (MVP needs 20). No human baseline, so SC2 can't be measured. Run-to-run variance is real: the same transcript scored 21 and then 23 (one criterion moved a level). Variance per case hasn't been measured (k runs).

## 8. Operations: GAPS
- **Evidence:** `CHANGELOG.md` (0.1.0 → 0.2.1), `DECISIONS.md`, `STATE.md` with a "Resume here", JSON envelope per run with versions and cost.
- **Gap:** the standard asks for a pinned model version; `--model opus` is an alias that moves with new releases, changing scores without a version bump. Pin the full model ID and record it in `versions.model`. Opus vs Sonnet not yet compared.

## Blocking gaps (before MVP)
1. Golden set: 20 real transcripts with a human score (currently 0).
2. Red-flag quotes are not grounding-checked before they're shown.
3. Model not pinned to a version.

## Next three actions
1. **Ground red flags in code:** run each `red_flags[].quotes` entry through `isGrounded`; drop ungrounded quotes and drop a red flag left with none; add a unit test.
2. **Pin and budget the model call:** default `--model` to a full model ID, pass `--max-budget-usd 0.50`, and add agent, prompt, rubric and model versions to the duplicate-cache key.
3. **Start the golden set:** hand-score 5 real transcripts on the rubric, run each 3 times, record human total vs agent mean and spread as G001–G005.

## Follow-up (same day, agent v0.3.0)
- Action 1 done: `groundRedFlags` in `src/lib.ts` removes ungrounded red-flag quotes and drops flags left with none; unit test added.
- Action 2 done: model pinned to `claude-opus-5-5`; `--max-budget-usd 0.5` per call with no retry after a budget stop; duplicate cache now re-scores when agent, prompt, rubric or model version differs.
- Still open (blocking for MVP): action 3, real golden cases with a human score.
