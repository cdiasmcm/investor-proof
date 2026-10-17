# Agent: investorproof (InvestorProof)

> Follows an 8-block agent design template (purpose, steps, input, output, tools, controls, evals,
> operations). Tier Lite: [L] and [if] fields
> are filled; [S]/[C] fields are `N/A (tier: Lite)` until the tier is raised.

**Tier:** Lite
**Stage:** Design
**Version:** 0.6.0 (see `CHANGELOG.md`)
**Business owner:** maintainer · **Tech owner:** maintainer

**Run it:** `bun src/score.ts <transcript.txt>` → `reports/<name>-<hash>.html` (+ `.json` envelope).
**The rubric:** `rubric/PERFECT-PITCH.md` (for people) · `rubric/rubric.json` (what the agent uses).

---

## 1. Purpose

- [L] **Job (one sentence, no "and"):** Score a VC pitch transcript against the perfect-pitch rubric for founders, so that they know their score out of 100 plus the must-have fixes before they face investors.
- [L] **Task selection:** zone Green · desired H-level H4 (agent grades on its own; the founder reads the report and decides) · AI capability 4/5, because grading prose against a written rubric with quoted evidence is a strong LLM task, and the arithmetic is moved to code
- [L] **Blockers** (data, sign-off, another team's system): no real pitch transcripts yet (the 23 samples are slide PDFs); the golden set needs real transcripts with a human score
- [L] **North-star metric:** agreement with a human expert's total (absolute difference, points out of 100) · **Baseline today:** none; panel scores aren't written down per criterion · **Target:** within ±10 points of the human score on 80% of golden cases
- [L] **Problem it solves:** founders rehearse without consistent, structured feedback; good pitch frameworks exist as slide templates but are rarely applied to the pitch as it is actually spoken
- [if: user-facing] **AI disclosure:** every report footer says the levels are AI-graded, the total is computed by code, and it is coaching, not an investment verdict
- [if: personal data] **Data protection (LGPD/GDPR):** transcripts hold founder names and business plans, no special-category data; nothing leaves the machine except the model call; reports stay in the local folder; delete the report to erase
- [C] **Regulatory / record-keeping needs:** N/A (tier: Lite)

## 2. Steps

- [L] **Trigger:** user runs the CLI with a transcript file

| # | Step (verb + object) | Level (C/L/W/A/H) | H-level | Why this level | Tier |
|---|----------------------|-------------------|---------|----------------|------|
| 1 | Clean the transcript; run input checks (length, encoding, duplicate hash) | C | H5 | Rules, no judgment | [L] |
| 2 | Grade 13 criteria: level 0–4, quotes, rationale, action, red flags | L | H4 | Needs judgment on prose; one structured call | [L] |
| 3 | Validate the grading (every criterion once, levels in range); retry once | C | H5 | Schema rules | [L] |
| 4 | Check every quote against the transcript; cap ungrounded criteria at level 1 | C | H5 | Grounding must always hold, so it's code | [L] |
| 5 | Compute points, total, band and must-have actions | C | H5 | Arithmetic and ranking belong in code | [L] |
| 6 | Render the HTML report; write the output envelope | C | H5 | Templating | [L] |
| 7 | Read the report; decide what to change in the pitch | H | — | The founder owns the pitch | [L] |

- [L] **Done when (stop condition):** an HTML report and a `completed` envelope are written, or the run returns `rejected` / `failed`
- [L] **Caps:** max iterations 2 model calls (no retry after a budget stop) · timeout 300 s per call · max cost US$0.50 per call via `--max-budget-usd` (observed $0.12–0.18)
- [L] **Escalate to a human after:** 2 failed grading attempts (returns `failed`, retryable), or on: `is_pitch: false`, an `injection_attempt` flag
- [L] **Exit reasons logged:** done / cap / timeout / budget / error / human_gate (keep as is)
- [S] **Plan-change limit:** N/A (tier: Lite; fixed pipeline, no planning)
- [S] **One agent or several?** N/A (tier: Lite). One LLM step inside a code pipeline; no split is justified
- [if: more than one agent] **Topology:** N/A (one agent)

## 5. Tools & Access

| Tool (namespaced, e.g. `crm.get_contact`) | Purpose (precise description) | Read / Write | Permission scope | Requires approval? | Tier |
|-------------------------------------------|-------------------------------|--------------|------------------|--------------------|------|
| `fs.read_transcript` | Read the one transcript file passed on the command line | Read | That file only | No | [L] |
| `fs.read_rubric` | Read `rubric/rubric.json` and `prompt/SYSTEM.md` | Read | Agent folder | No | [L] |
| `llm.grade` | `claude -p` with no tools, no MCP, no settings, JSON-schema output | Read (model call) | Transcript + rubric only | No | [L] |
| `fs.write_report` | Write `<name>-<hash>.html` and `.json` next to the transcript (or `--out`) | Write | The transcript's folder (or `--out`), new files only | No | [L] |

- [L] **Tools are distinct** (no overlapping names, descriptions or parameters); tool responses are short and errors say what to do next: yes; the model itself has zero tools (`--tools ""`), everything else is code
- [L] **Agent identity:** runs as the local user's Claude Code login (subscription) · no API keys or credentials stored in files · no shared service accounts
- [L] **Trifecta:** private data yes (business plans) · untrusted content yes (transcript) · outbound channel **no** → **leg removed in code:** the model runs with all tools disabled, no MCP servers and no settings sources, so it cannot send anything anywhere; its only output is JSON parsed by code
- [if: writes] **Safe writes per write tool:** preview → commit N/A (local new files only) · service-side ceiling N/A · idempotency key: sha256 of the cleaned transcript in the filename; the same transcript reuses its report unless `--force` · compensating action: delete the report · audit record: the `.json` envelope
- [if: writes] **3 a.m. test:** a misfire writes a wrong report on the local disk; nobody else sees it; re-running with `--force` fixes it
- [if: runs code] **Sandbox:** N/A (runs only its own code; the model cannot execute code)
- [S] **Third-party tools / MCP servers / skills vetted:** N/A (tier: Lite; dependencies are bun and the Claude Code CLI only)

## 6. Controls

| Action | H-level (H1–H5) | Checkpoint (in-loop / draft review / deferred) | Reviewer | Max wait | Tier |
|--------|-----------------|------------------------------------------------|----------|----------|------|
| Grade a pitch and write the report | H4 | deferred (founder reads the report) | Founder | n/a | [L] |

- [L] **Must never do** (each enforced in code / config / approval, not only in the prompt):
  - Let the model set the total score → code computes it from levels (`src/lib.ts` `score`)
  - Let any model write or change the report HTML → models return JSON only (`schema/grading.schema.json`); `src/portable.ts` validates it and `src/render.ts` renders it; the layout is locked by snapshot and section-order tests (`src/format.test.ts`) for every model
  - Credit evidence that wasn't said → quotes checked against the transcript; ungrounded criteria capped at level 1 (`isGrounded`)
  - Follow instructions inside a transcript → the model has no tools; output is schema-bound JSON; injection cases in the golden set must pass
  - Overwrite a previous report silently → hash in the filename; re-scoring needs `--force`
  - Score a non-pitch → `is_pitch: false` forces every level to 0 in code
- [L] **Accepted risk (direct-HTML path):** automations that fetch `prompt/SYSTEM.md` and save the model reply as the report (e.g. n8n without a code step) get the layout by instruction, not code: the prompt embeds the renderer's exact example report and arithmetic (kept in sync by `src/format.test.ts`), but quote checks and totals there are done by the model. Recommended mitigation: run `dist/investorproof.js` in a code step
- [L] **Autonomy plan:** dry run on fictional sample transcripts → draft-only: compare with a human score on real transcripts (golden set) → execute: share reports with other founders once ±10-point agreement holds (each step logged in `DECISIONS.md`)
- [S] **Guardrails:** N/A (tier: Lite; injection handled by the trifecta break above)
- [S] **Kill switch:** N/A (tier: Lite; runs only when invoked)
- [C] **Kill switch tested** (date, result): N/A (tier: Lite)
- [S] **OWASP Agentic Top 10 check:** N/A (tier: Lite)

## 8. Operations

- [L] **Model** (pinned version) + reasoning effort: `claude-opus-5-5` (pinned ID, not an alias), default effort; override with `--model <id>` · **why this tier:** grading is judgment work; a cheaper model not yet compared on the golden set
- [L] **Budget enforced at:** the CLI (`--max-budget-usd 0.5` per call, checked after each model turn, so one turn can overshoot) plus code (2 calls max, 300 s timeout, budget stop ends the run with `exit_reason: budget`) · per run ~US$0.15 observed, US$1.00 worst case · per month n/a (manual use)
- [L] **Logging:** one `.json` envelope per run (score, levels, flags, cost, versions); the transcript is not copied · no secrets handled · readable by whoever runs it (reports stay on the local disk)
- [L] **Registry entry:** agent investorproof · solution InvestorProof pitch coaching · mission score pitch transcripts against the perfect-pitch rubric · tier/stage Lite/Design · owners maintainer · model claude-opus-5-5 · status draft · **portfolio registry kept at:** none
- [L] **Version history** kept in `CHANGELOG.md`: release unit = prompt + model + tools + memory config + I/O contract (keep as is)
- [L] **Human-decision log** (runtime approvals, rejections, edits, overrides): stored in `evals/GOLDEN-SET.md` (human score vs agent score per case) · fields: request_id, agent version, action, preview shown, decision, decided_by, time, reason, final value (keep as is) · retention indefinite · access owner
- [S] **Edits and overrides feed evals:** N/A (tier: Lite)
- [S] **Rollout:** N/A (tier: Lite)
- [S] **Tracing format:** N/A (tier: Lite)
- [S] **Where it runs:** N/A (tier: Lite; local CLI)
- [if: memory] **Memory rules:** N/A (stateless; nothing remembered between runs)
- [L] **Handoff files** present: `STATE.md` (Resume here), `DECISIONS.md`, `CHANGELOG.md`, `reviews/` (keep as is)
