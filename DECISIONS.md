# Decisions — design-time human decisions

Architecture choices, splits into more agents, permission changes (dry run → draft → execute),
accepted risks. Append-only: never edit an old entry; add a new one that supersedes it.
Runtime human decisions (approvals, rejections, edits) go to the human-decision log (`AGENT.md` §8),
not here.

Format: `- YYYY-MM-DD — decision — why — who`

- 2026-10-16 — Tier Lite; output is an HTML report with total, breakdown and must-have actions — internal coaching tool, read-only, reversible — maintainer
- 2026-10-16 — Rubric built from a review of 23 early-stage pitch decks plus common VC deck frameworks — the decks show what separates strong from weak pitches; the frameworks give the structure — maintainer
- 2026-10-16 — Validation (12) and business model/unit economics (12) are the heaviest criteria — they varied most across the reviewed decks and answer investors' first questions — maintainer
- 2026-10-16 — Slide design and live presence are excluded — not observable in a transcript — maintainer
- 2026-10-16 — One LLM call inside a code pipeline; the model returns levels and quotes, code computes the score and picks must-haves — prompts steer, code enforces; keeps the score reproducible from levels — maintainer
- 2026-10-16 — Run the model through `claude -p` with tools, MCP and settings disabled — no API key needed; disabling tools removes any outbound channel for injected instructions — maintainer
- 2026-10-16 — Ungrounded evidence caps a criterion at level 1 (not 0) — tolerates minor transcription differences while blocking invented proof — maintainer
- 2026-10-16 — Reports are saved next to the transcript by default — results stay beside each pitch — maintainer
- 2026-10-16 — Renamed for public release; published under MIT with fictional samples only — prepare for a public repository with no personal data, local paths or third-party names — maintainer
- 2026-10-16 — Renamed to InvestorProof before the first public push — a different AI investing product already uses the previous name; web search found no product or trademark named InvestorProof (not a legal clearance) — maintainer
