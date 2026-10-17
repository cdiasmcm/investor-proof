# InvestorProof

See your pitch the way a venture investor does. InvestorProof reads a pitch **transcript**, grades it
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

## Privacy
The transcript is sent to the model provider through your Claude Code login. Reports stay on your
disk. Don't commit real transcripts or reports: `.gitignore` excludes `reports/`, `transcripts/`,
`.srt` and `.vtt` files.

## Disclaimer
InvestorProof is a coaching tool. Its scores are AI-assisted opinions, not investment advice or a
prediction of funding outcomes.

## Repository layout
| Path | What |
|------|------|
| `rubric/` | `PERFECT-PITCH.md` (for people) and `rubric.json` (what the agent uses) |
| `prompt/SYSTEM.md` | Grading instructions |
| `src/` | `score.ts` (CLI), `lib.ts` (checks + scoring), `render.ts` (HTML), tests |
| `samples/` | Fictional test transcripts: strong, weak, prompt-injection |
| `AGENT.md`, `io/`, `evals/`, `CHANGELOG.md`, `DECISIONS.md`, `STATE.md`, `reviews/` | Agent design docs (8 blocks: purpose, steps, input, output, tools, controls, evals, operations) |

## Contributing
Issues and pull requests are welcome. Run `bun test` before opening a PR. Use only fictional or
anonymized transcripts in examples and tests.

## License
[MIT](LICENSE)
