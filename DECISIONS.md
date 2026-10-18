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
- 2026-10-16 — The report format is enforced by code for every LLM: models return JSON only, one renderer builds the HTML, and tests lock the layout — the same report is required whether Claude, Gemini or another model runs — maintainer
- 2026-10-16 — The n8n flow stays unchanged; `prompt/SYSTEM.md` (what it fetches) now makes the model write the finished HTML from an exact, generated example; local runs keep the code renderer via `prompt/GRADING.md` — owner requires no flow changes; accepted risk: in that path layout, quotes and arithmetic are instructed, not code-enforced — maintainer
- 2026-10-16 — Extra content a workflow asks the model for (e.g. an email summary) is placed in a hidden <template> inside the report, so the n8n flow stays unchanged and its extraction keeps working — the flow saved the whole model reply, so a summary before <!doctype html> showed up as text — maintainer
- 2026-10-18 — Renamed to “What are you building?”; the GitHub repo (`investor-proof`) and the local folder keep their names so existing links, raw URLs and the n8n flow keep working. A USPTO search found the exact phrase registered by Mitsubishi Electric in classes 7, 11 and 37 (elevators, HVAC, construction), none in software or coaching; accepted as low risk for a free MIT tool, not legal advice. Code-safe forms: `what-are-you-building`, `WhatAreYouBuilding` — maintainer
