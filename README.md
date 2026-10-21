# What are you building?

See your pitch the way a venture investor does. The agent reads a pitch **transcript**, grades it
against a 13-criterion "perfect pitch" rubric and writes an HTML report with:

- one **total score** out of 100 (a perfect pitch scores 100%)
- the **breakdown** per criterion, with the quotes that earned each level
- the **must-have actions** that would raise the score most, plus red flags an investor will raise

The rubric was built from a review of 23 early-stage startup pitch decks from an MBA entrepreneurship
course, checked against common venture-capital pitch deck frameworks. See
[`rubric/PERFECT-PITCH.md`](rubric/PERFECT-PITCH.md).

## Quick start
Requirements: [Bun](https://bun.sh) 1.1+ and the [Claude Code](https://docs.claude.com/en/docs/claude-code) CLI, logged in. No API key and no npm dependencies.

```bash
bun src/score.ts path/to/transcript.txt
```

Each grading call is capped at US$0.50. The report is saved **next to the transcript** as `<name>-<hash>.html`, plus a `<name>-<hash>.json`
with the scores. Accepts `.txt`, `.md`, `.srt` and `.vtt` (subtitle timings are stripped).

| Option | Default | What it does |
|--------|---------|--------------|
| `--out <folder>` | transcript's folder | Save the report somewhere else |
| `--model <id>` | `claude-opus-5-5` | Claude model used for grading (pinned so scores don’t drift) |
| `--force` | off | Re-score a transcript that was already scored |

Try it on the fictional samples: `bun src/score.ts samples/strong-pitch.txt`.

## How scoring works
1. Code checks the transcript (150–25,000 words, UTF-8) and hashes it, so the same transcript isn't scored twice.
2. Claude, running with **no tools**, grades each criterion from 0 to 4, with verbatim quotes, an action for each gap, and red flags.
3. Code checks that every quote really appears in the transcript (unsupported criteria are capped at level 1; invented red-flag quotes are removed), computes the score and picks 3–5 must-have actions. The model never sets the total.

| # | Criterion | Weight |
|---|-----------|-------:|
| C01 | Company purpose (the hook) | 5 |
| C02 | Problem | 9 |
| C03 | Solution and how it works | 7 |
| C04 | Customer validation and traction | 12 |
| C05 | Market size and target customer | 8 |
| C06 | Why now | 3 |
| C07 | Competition and defensible advantage | 8 |
| C08 | Business model and unit economics | 12 |
| C09 | Go-to-market, launch and growth | 9 |
| C10 | Team and advisors | 7 |
| C11 | Financials and assumptions | 7 |
| C12 | The ask, use of funds, investor return | 7 |
| C13 | Delivery and storytelling | 6 |

Levels map to 0 / 25 / 50 / 75 / 100% of each weight. Bands: Investor-ready ≥ 85, Strong ≥ 70,
Promising ≥ 55, Weak ≥ 40, Not ready below 40. To change the rubric, edit `rubric/rubric.json`
(weights must sum to 100; `bun test` checks it).

## Two ways to run it
| Where | What the model returns | Who builds the HTML | Where the report goes |
|-------|------------------------|---------------------|-----------------------|
| **Locally** (`bun src/score.ts transcript.txt`) | JSON (`prompt/GRADING.md`) | Code (`src/render.ts`), quote-checked and scored in code | Next to the transcript |
| **Automation that saves the model's reply as a file** (e.g. n8n: fetch `prompt/SYSTEM.md` + `rubric/rubric.json` → LLM → file → email) | The finished HTML report (`prompt/SYSTEM.md`) | The model, following an exact template generated from `src/render.ts` | Wherever your automation sends it |

In the second mode the layout is **instructed, not enforced**: `prompt/SYSTEM.md` embeds a complete example
report with the real CSS and markup, plus the scoring arithmetic, so any capable model reproduces the
format. Quote checking and the arithmetic are done by the model there. For code-enforced results in an
automation, run `dist/what-are-you-building.js` in a code step (below).

Raw URLs for automations:
- `https://raw.githubusercontent.com/cdiasmcm/investor-proof/main/prompt/SYSTEM.md`
- `https://raw.githubusercontent.com/cdiasmcm/investor-proof/main/rubric/rubric.json`

## Use it with any LLM (Claude, Gemini, GPT, local models)
The report format is fixed by code, not by the model. Every model only returns JSON that matches
[`schema/grading.schema.json`](schema/grading.schema.json); the agent validates it, scores it and
renders the same HTML layout every time. Tests lock that layout (`src/format.test.ts`).

[`dist/what-are-you-building.js`](dist/what-are-you-building.js) is a single dependency-free script for any JavaScript
runtime (n8n Code node, Node, a browser). It defines `WhatAreYouBuilding`:

```js
// 1. Prompts for whatever LLM you call
const system = WhatAreYouBuilding.systemPrompt();          // instructions + rubric + JSON contract
const user = WhatAreYouBuilding.userPrompt(transcript);
// 2. Send them to Claude, Gemini, GPT or another model; ask for JSON (use its JSON/schema mode if it has one)
// 3. Turn the model reply (text or object) into the report
const out = WhatAreYouBuilding.finalize({ grading: modelReply, transcript, model: "gemini-2.5-pro", source: "pitch.ogg" });
if (out.ok) { /* out.html, out.envelope.result.total_score */ } else { /* out.errors: retry the model call */ }
```

In n8n, paste `dist/what-are-you-building.js` at the top of a Code node and add the lines above below it.
Rebuild it after changing the rubric or renderer: `bun scripts/build.ts` (`bun test` fails if it is stale).

## Privacy
The transcript is sent to the model provider through your Claude Code login. Reports stay on your
disk. Don't commit real transcripts or reports: `.gitignore` excludes `reports/`, `transcripts/`,
`.srt` and `.vtt` files.

## Disclaimer
This agent is a coaching tool. Its scores are AI-assisted opinions, not investment advice or a
prediction of funding outcomes.

## Repository layout
| Path | What |
|------|------|
| `rubric/` | `PERFECT-PITCH.md` (for people) and `rubric.json` (what the agent uses) |
| `prompt/GRADING.md` | Grading instructions for local, code-rendered runs (model returns JSON) |
| `prompt/SYSTEM.md` | Generated prompt for automations: the model returns the finished HTML report |
| `src/` | `score.ts` (CLI), `portable.ts` (model-agnostic core), `lib.ts` (checks + scoring), `render.ts` (HTML), tests |
| `dist/what-are-you-building.js` | Generated single-file build of the core for n8n, Node or browsers |
| `schema/grading.schema.json` | The JSON every model must return |
| `scripts/build.ts` | Regenerates `dist/` and `schema/` |
| `samples/` | Fictional test transcripts: strong, weak, prompt-injection |
| `evals/cases.json` | Eval cases and expected results; `bun run eval` writes `evals/results.json` and `evals/RESULTS.md` |
| `AGENT.md`, `io/`, `evals/`, `CHANGELOG.md`, `DECISIONS.md`, `STATE.md`, `reviews/` | Agent design docs (8 blocks: purpose, steps, input, output, tools, controls, evals, operations) |

## Contributing
Issues and pull requests are welcome. Use only fictional or anonymized transcripts in examples and tests.

Every pull request into `main` must pass two GitHub checks:

1. **unit-tests**: runs `bun test` (19 tests: scoring rules, report format, publish guard).
2. **eval-results**: checks that the committed `evals/results.json` is current for your code and that
   every eval case still meets its expected results. It makes no model calls.

If your change touches `prompt/`, `rubric/`, `src/`, the eval scripts or `evals/cases.json`, run the
evals yourself and commit the results:

```bash
bun test
bun run eval        # scores every case in evals/cases.json with your own claude login
git add evals/results.json evals/RESULTS.md
```

The evals run on **your own model account**, about US$0.13 per case on the default model, so the project
costs the maintainer nothing to keep honest. Changes to docs only don't need a new eval run.
Eval results are self-reported, so the maintainer re-runs `bun run eval` before merging any change
that can affect scores.

## License
[MIT](LICENSE)
