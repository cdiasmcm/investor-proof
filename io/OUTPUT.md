# Block 4 — Output

The agent returns a **standard output envelope** (request id, status, exit reason, result, flags, data-quality checks, metrics, versions) as `<name>-<hash>.json` and prints
it to stdout, plus a human report `<name>-<hash>.html`. This file defines the `result` fields.

**Output contract name + version:** `investorproof-result v1`

## Result fields
| Field | Type | Required | Rule | DQ check | Tier |
|-------|------|----------|------|----------|------|
| `company_name` | string | yes | As said in the pitch | Non-empty (falls back to file name in the report) | [L] |
| `is_pitch` | boolean | yes | false = not a startup pitch | If false, every level forced to 0 | [L] |
| `total_score` | integer | yes | 0–100; sum of weight × level fraction, computed in code | Equals the sum of `criteria[].points`, rounded | [L] |
| `band` | enum(Investor-ready\|Strong\|Promising\|Weak\|Not ready) | yes | ≥85 / ≥70 / ≥55 / ≥40 / below | Derived in code from `total_score` | [L] |
| `report_path` | string | yes | Absolute path to the HTML report | File written | [L] |
| `criteria` | array<object> | yes | 13 items: id, name, weight, level 0–4, points, must_have, action | Every rubric id exactly once; level integer 0–4 | [L] |

## Where it lands
- [L] **Delivered to:** the founder (HTML report opened in a browser); the JSON envelope for scripts and evals
- [if: writes] **Preview shown before commit:** N/A (writes only its own new report files)

## Data quality checks (before release)
- [L] **Schema-valid:** the model's JSON is schema-constrained by the CLI; `checkGrading` re-checks ids and level ranges; one retry, then `failed`
- [L] **Business rules:** weights sum to 100 (unit test); total = Σ points; 3–5 must-have actions chosen by points lost
- [S] **Grounded:** every evidence quote is matched against the transcript; a criterion above level 1 with no grounded quote is capped at 1 and flagged `ungrounded_<id>`; red-flag quotes are checked the same way: ungrounded quotes are removed, and a red flag left with none is dropped (`groundRedFlags`)
- [S] **No leakage:** N/A (tier: Lite; output stays local)
- [L] **On a failed check:** retry the model call once; if it fails again, return `status: failed`, `retryable: true`
