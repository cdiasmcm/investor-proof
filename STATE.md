# STATE

Resume here → Score 3–5 real pitch transcripts by hand with `rubric/PERFECT-PITCH.md`, run the agent on the same files, and add them as G001+ in `evals/GOLDEN-SET.md` with both totals.

## Open items (2026-10-17)
- **Private items** (deck link, speaker script, placeholders): see `docs/HANDOFF.md` (local only, gitignored).
- **n8n:** switch the Gemini node from "Gateway credits" to your own Gemini API key (fixes the 524 timeout); use a stable model; turn on Retry On Fail. Then a live test: email body still shows the summary, attachment has no stray text.
- **Calibration:** golden set G001+ (20 real human-scored transcripts); 2 investor judges by Dec 15; targets by Jan 16, 2027.
- **Repo:** v0.6.1 on GitHub `main` (`ef717bd`).

## Log
<!-- Append-only. Newest at the bottom. Format: - YYYY-MM-DD — who — what was done / what is pending -->
- 2026-10-16 — maintainer — First build: rubric, scorer (bun + `claude -p`), HTML report, unit tests, fictional sample transcripts. Pending: real golden cases, rubric weight review, opus vs sonnet comparison
- 2026-10-16 — maintainer — v0.2.0: renamed and prepared for a public repository (generic provenance, fictional samples, publish guard test, MIT license)
- 2026-10-16 — maintainer — Standards audit (v0.2.1): 3 PASS, 5 GAPS; blocking: no real golden cases, ungrounded red-flag quotes, unpinned model. Report in reviews/
- 2026-10-16 — maintainer — v0.3.0: fixed audit actions 1 and 2 (grounded red flags, pinned model, budget cap, versioned cache). Open: real golden cases
- 2026-10-16 — maintainer — v0.4.0: renamed to InvestorProof; prepared first public push
- 2026-10-16 — maintainer — v0.5.0: model-agnostic core + portable bundle; HTML format locked by tests (18 pass)
- 2026-10-16 — maintainer — v0.6.0: direct-HTML prompt for the n8n flow (simulated call matched the reference CSS and sections); local runs unchanged
- 2026-10-16 — maintainer — v0.6.1: fixed stray email summary, guessed date/model and footer wording in the direct-HTML path; pushed
