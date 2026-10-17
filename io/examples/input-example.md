# Input example

Command: `bun src/score.ts samples/strong-pitch.txt`

Implicit envelope: `request_id` = `ip-<sha256 prefix of the cleaned transcript>` ·
`caller.type` = user · `constraints.mode` = execute · `constraints.budget` = 2 model calls, 300 s ·
`trust.parts` = [{source: transcript, trusted: false}, {source: rubric, trusted: true}].

Payload: `transcript_path` = `samples/strong-pitch.txt` (fictional, three speakers).
