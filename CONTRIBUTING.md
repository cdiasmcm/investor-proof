# Contributing

Thanks for helping. Issues and pull requests are welcome. Use only fictional or anonymized transcripts in
examples, tests and eval cases.

## The two checks every pull request must pass

| Check | What it verifies | What you run |
|-------|------------------|--------------|
| **unit-tests** | `bun test`: scoring rules, report format, publish guard | `bun test` |
| **eval-results** | The committed `evals/results.json` is current for your code, and every eval case still meets its expected result | `bun run eval`, then commit the results |

GitHub blocks the merge until both are green. **eval-results** makes no model calls: it only checks the
results you committed. The evals themselves run on your machine, on your own model account, so the
project costs the maintainer nothing to keep honest.

## Do I need to run the evals?

Only if your PR changes a file that can affect scores:

- `prompt/`, `rubric/`
- `src/*.ts` (not tests)
- `scripts/html-prompt.ts`, `scripts/eval.ts`, `scripts/eval-lib.ts`
- `evals/cases.json` or a transcript it uses (`samples/`)

Docs, README, tests and workflow changes never need a new eval run. If you're unsure, push: the
**eval-results** check tells you.

## Running the evals

**One-time setup**

1. Install [Bun](https://bun.sh).
2. Install the Claude Code CLI and sign in by running `claude` once. The evals use that login, so they
   bill your own Claude plan or API credits.

**Every time you change something that can affect scores**

```bash
bun install
bun test
bun run eval
git add evals/results.json evals/RESULTS.md
git commit -m "Update eval results"
git push
```

`bun run eval` scores every case in `evals/cases.json` (about US$0.40 for the current cases on the default
model) and rewrites `evals/results.json` and `evals/RESULTS.md`.

## If an eval case fails

A failing case means your change made an expected score worse. Look at `evals/RESULTS.md`: it names the
case and the check that missed (for example `S001: total 58 not in 60–80`).

- Usually: adjust your change and run `bun run eval` again.
- If the expectation itself is wrong, change it in `evals/cases.json` and explain why in the PR description.
  The maintainer reviews every change to the cases.

## How results are trusted

Results are self-reported: CI checks they are current and passing, not that a model really produced
them. Before merging a change that can affect scores, the maintainer re-runs `bun run eval`.
