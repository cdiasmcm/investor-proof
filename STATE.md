# STATE

Resume here → Score 3–5 real pitch transcripts by hand with `rubric/PERFECT-PITCH.md`, run the agent on the same files, and add them as G001+ in `evals/GOLDEN-SET.md` with both totals.

## Log
<!-- Append-only. Newest at the bottom. Format: - YYYY-MM-DD — who — what was done / what is pending -->
- 2026-10-16 — maintainer — First build: rubric, scorer (bun + `claude -p`), HTML report, unit tests, fictional sample transcripts. Pending: real golden cases, rubric weight review, opus vs sonnet comparison
- 2026-10-16 — maintainer — v0.2.0: renamed and prepared for a public repository (generic provenance, fictional samples, publish guard test, MIT license)
- 2026-10-16 — maintainer — Standards audit (v0.2.1): 3 PASS, 5 GAPS; blocking: no real golden cases, ungrounded red-flag quotes, unpinned model. Report in reviews/
- 2026-10-16 — maintainer — v0.3.0: fixed audit actions 1 and 2 (grounded red flags, pinned model, budget cap, versioned cache). Open: real golden cases
- 2026-10-16 — maintainer — v0.4.0: renamed to InvestorProof; prepared first public push
