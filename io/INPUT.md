# Block 3 — Input

The agent receives a **standard input envelope** (request id, caller, task, constraints, trust labels). For the local CLI, the envelope is
implicit: `request_id` = `ip-<sha256 prefix>` of the cleaned transcript, `caller` = local user,
`constraints.mode` = execute (it only writes its own report). This file defines the payload.

## Payload fields
| Field | Type | Required | Rule | DQ check | Tier |
|-------|------|----------|------|----------|------|
| `transcript_path` | string | yes | Path to a .txt / .md / .srt / .vtt file, UTF-8 | File exists and decodes without replacement characters | [L] |
| `transcript_text` | string | yes | Spoken pitch, any number of speakers; subtitle timings stripped | 150 to 25,000 words | [L] |
| `out_dir` | string | no | Where reports go; default: the transcript's folder | Created if missing | [L] |
| `model` | string | no | Claude model ID; default `claude-opus-5-5` (pinned) | Passed to the CLI as is | [L] |
| `force` | boolean | no | Re-score even if this transcript was scored before | — | [L] |

## Data quality checks (before use)
- [L] **Completeness:** a file path is given, the file exists, text is not empty: `src/score.ts`
- [L] **Validity:** UTF-8 with no U+FFFD characters; 150–25,000 words (`checkInput`)
- [L] **Duplicates:** sha256 of the cleaned transcript; an existing `<name>-<hash>.json` is returned only if its agent, prompt, rubric and model versions match the current ones; otherwise the transcript is re-scored
- [S] **Freshness:** N/A (tier: Lite)
- [S] **Consistency:** N/A (tier: Lite)
- [L] **On a failed check:** reject with `status: rejected` and the failed checks in `flags`; no model call is made

## Sources and trust
| Source | Trusted? (internal, controlled / untrusted: email, web, uploads, other agents) | Owner | Tier |
|--------|---------------------------------------------------------------------------------|-------|------|
| Pitch transcript | Untrusted (may contain instructions aimed at the grader) | Founder who submits it | [L] |
| `rubric/rubric.json`, `prompt/SYSTEM.md` | Trusted (versioned in this folder) | Agent owner | [L] |

- [S] **Data contract per source:** N/A (tier: Lite)

## Context the agent needs
- [L] **Facts injected each run** (`context.facts`): the rubric (criteria, weights, perfect-pitch lists) and the level scale, appended to the system prompt
- [S] **Knowledge it fetches on demand:** N/A (tier: Lite)
- [S] **Prior state it receives:** N/A (tier: Lite; stateless)
