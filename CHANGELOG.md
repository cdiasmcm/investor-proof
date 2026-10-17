# Changelog — agent versions

One version = the **release unit**: prompt + model + tools + memory config + I/O contract. Every
trace and output carries this version (`versions.agent`). Rollback = repoint to the last version
marked **good**. Newest at the top. Never edit an old row.

| Version | Date | What changed | Why (→ DECISIONS) | Eval before → after | Gate (stage, decision, approver) | Status |
|---------|------|--------------|-------------------|---------------------|-----------------------------------|--------|
| 0.6.0 | 2026-10-16 | Two prompt files: `prompt/GRADING.md` (JSON, local code-rendered runs) and generated `prompt/SYSTEM.md` (model writes the finished HTML from an exact example rendered by `src/render.ts`, for automations such as n8n that save the reply as the file); stale + parity test | Owner: n8n flow must stay unchanged and send the same HTML | 18 → 19 tests; simulated n8n call: CSS identical, same sections, arithmetic correct | Design, n/a | draft |
| 0.5.0 | 2026-10-16 | Model-agnostic report format: `src/portable.ts` (prompts, JSON contract, tolerant parser, finalize) used by the CLI and by `dist/investorproof.js` for any LLM or runtime; `schema/grading.schema.json`; prompt v1.2.0 appends the output contract; format locked by snapshot, section-order, cross-model, escaping, stale-build and bundle-parity tests | Owner: same HTML whatever the LLM | 11 → 18 tests pass | Design, n/a | draft |
| 0.4.0 | 2026-10-16 | Renamed to InvestorProof (an existing product used the previous name); contract `investorproof-result v1`; request ids `ip-<hash>` | Avoid a naming clash before publishing | tests pass | Design, n/a | draft |
| 0.3.0 | 2026-10-16 | Audit fixes: red-flag quotes grounded in code; model pinned to claude-opus-5-5; US$0.50 per-call budget via --max-budget-usd (no retry after a budget stop); duplicate cache re-scores when agent, prompt, rubric or model version changes; +1 unit test | standards audit 2026-10-16 | 10 → 11 tests pass | Design, n/a | draft |
| 0.2.1 | 2026-10-16 | Report layout: breakdown right after the summary, then must-haves, other improvements in an expandable button, then what worked and red flags side by side; grader flags removed from HTML (kept in the JSON) | Owner request | tests pass | Design, n/a | draft |
| 0.2.0 | 2026-10-16 | Renamed for public release; new contract name; rubric v1.1.0 and prompt v1.1.0 (generic wording, same criteria and weights); fictional samples; publish guard test | Public release prep | see STATE / GOLDEN-SET | Design, n/a | draft |
| 0.1.1 | 2026-10-16 | Default output folder = the transcript's folder (`--out` still overrides) | Results beside each pitch | unit tests pass | Design, n/a | draft |
| 0.1.0 | 2026-10-16 | First build: rubric v1.0.0 (13 criteria), prompt v1.0.0, model opus via `claude -p` (no tools), HTML report | First design | unit tests pass | Design, n/a | draft |
