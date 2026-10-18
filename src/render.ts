// What are you building?: renders the pitch score as one self-contained HTML report (no external assets).
import type { ScoredCriterion } from "./lib";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const LEVEL = ["Absent", "Mentioned", "Partial", "Solid", "Investor-grade"];

export type ReportData = {
  company: string;
  summary: string;
  total: number;
  band: { label: string; meaning: string };
  criteria: ScoredCriterion[];
  strengths: string[];
  red_flags: { issue: string; quotes: string[] }[];
  flags: string[];
  notScored: string[];
  meta: { date: string; source: string; words: number; model: string; agent: string; rubric: string; hash: string };
};

function ring(total: number): string {
  const r = 54, c = 2 * Math.PI * r, off = c * (1 - total / 100);
  return `<svg viewBox="0 0 128 128" class="ring" role="img" aria-label="Score ${total} out of 100">
  <circle cx="64" cy="64" r="${r}" class="ring-bg"/>
  <circle cx="64" cy="64" r="${r}" class="ring-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 64 64)"/>
  <text x="64" y="62" class="ring-num">${total}%</text><text x="64" y="84" class="ring-sub">of perfect pitch</text></svg>`;
}

export function renderHtml(d: ReportData): string {
  const must = d.criteria.filter((c) => c.must_have).sort((a, b) => b.points_lost - a.points_lost);
  const other = d.criteria.filter((c) => !c.must_have && c.level < 4).sort((a, b) => b.points_lost - a.points_lost);

  const rows = d.criteria.map((c) => `
    <tr>
      <td><span class="cid">${c.id}</span> ${esc(c.name)}</td>
      <td class="num">${c.weight}</td>
      <td><span class="lvl l${c.level}">${c.level} · ${LEVEL[c.level]}</span></td>
      <td class="bar-cell"><div class="bar"><div style="width:${(c.points / c.weight) * 100}%"></div></div></td>
      <td class="num"><b>${c.points}</b></td>
    </tr>
    <tr class="detail"><td colspan="5">
      <details><summary>Why ${c.level}/4</summary>
        <p>${esc(c.rationale)}</p>
        ${c.grounded_evidence.length ? `<ul class="quotes">${c.grounded_evidence.map((q) => `<li>“${esc(q)}”</li>`).join("")}</ul>` : `<p class="muted">No supporting quote found in the transcript.</p>`}
      </details>
    </td></tr>`).join("");

  const actionCard = (c: ScoredCriterion) => `
    <li class="action"><div class="action-head"><span class="cid">${c.id}</span> ${esc(c.name)}
      <span class="gain">+${c.points_lost} pts possible</span></div><p>${esc(c.action)}</p></li>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>What are you building? — ${esc(d.company)}</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--ink:#1d1f23;--muted:#6b7078;--line:#e4e4e0;--accent:#2f6fde;--good:#1f9d63;--warn:#d98a1c;--bad:#d2453b;--track:#ececE8}
@media (prefers-color-scheme:dark){:root{--bg:#141518;--card:#1d1f23;--ink:#ececec;--muted:#9aa0a8;--line:#2e3036;--accent:#6b9cff;--good:#3ccf8e;--warn:#f0ad4e;--bad:#ff6b61;--track:#2a2c31}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:980px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}.muted{color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px}
.hero{display:flex;gap:28px;align-items:center;flex-wrap:wrap}.ring{width:170px;height:170px;flex:none}
.ring-bg{fill:none;stroke:var(--track);stroke-width:12}.ring-fg{fill:none;stroke:var(--accent);stroke-width:12;stroke-linecap:round}
.ring-num{font-size:30px;font-weight:700;text-anchor:middle;fill:var(--ink)}.ring-sub{font-size:9.5px;text-anchor:middle;fill:var(--muted)}
.band{display:inline-block;padding:3px 10px;border-radius:99px;background:var(--accent);color:#fff;font-weight:600;font-size:13px}
.hero-text{flex:1;min-width:260px}
ul.actions{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.action{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--bad);border-radius:10px;padding:12px 16px}
.action.soft{border-left-color:var(--warn)}.action p{margin:6px 0 0}
.action-head{font-weight:600;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.gain{margin-left:auto;color:var(--good);font-size:13px;font-weight:600}
.cid{font:600 11px ui-monospace,monospace;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:1px 5px}
.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:620px}
th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:middle}th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
tr.detail td{padding-top:0;border-bottom:1px solid var(--line)}tr:has(+tr.detail) td{border-bottom:none}
.num{text-align:right;white-space:nowrap}.bar-cell{width:28%}.bar{height:8px;background:var(--track);border-radius:99px;overflow:hidden}.bar div{height:100%;background:var(--accent)}
.lvl{font-size:12px;padding:2px 8px;border-radius:99px;white-space:nowrap;border:1px solid var(--line)}
.l0{color:var(--bad)}.l1{color:var(--bad)}.l2{color:var(--warn)}.l3{color:var(--accent)}.l4{color:var(--good)}
details summary{cursor:pointer;color:var(--muted);font-size:13px}details p{margin:6px 0}
.quotes{margin:6px 0;padding-left:18px;color:var(--muted);font-style:italic}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:720px){.cols{grid-template-columns:1fr}}
details.more{margin-top:16px}details.more>summary{display:inline-flex;align-items:center;gap:8px;list-style:none;padding:8px 16px;border:1px solid var(--line);border-radius:99px;background:var(--card);color:var(--ink);font-size:14px;font-weight:600}
details.more>summary::-webkit-details-marker{display:none}details.more>summary::before{content:"+";color:var(--accent);font-weight:700}
details.more[open]>summary::before{content:"−"}details.more>summary:hover{border-color:var(--accent)}details.more>ul{margin-top:12px}
footer{margin-top:36px;font-size:12px;color:var(--muted)}
</style></head><body><main>
<p class="muted">What are you building? Report · ${esc(d.meta.date)}</p>
<h1>${esc(d.company)}</h1>

<section class="card hero">
  ${ring(d.total)}
  <div class="hero-text">
    <span class="band">${esc(d.band.label)}</span> <span class="muted">${esc(d.band.meaning)}</span>
    <p>${esc(d.summary)}</p>
    <p class="muted">A perfect pitch scores 100%: investor-grade on all 13 criteria of the rubric built from a review of 23 early-stage pitch decks.</p>
  </div>
</section>

<h2>Score breakdown</h2>
<div class="card table-wrap"><table>
  <thead><tr><th>Criterion</th><th class="num">Weight</th><th>Level</th><th>Share earned</th><th class="num">Points</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td><b>Total</b></td><td class="num">100</td><td></td><td></td><td class="num"><b>${d.total}</b></td></tr></tfoot>
</table></div>

<h2>Must-have actions to improve your pitch</h2>
<ul class="actions">${must.map(actionCard).join("") || "<li class='muted'>None — every criterion is investor-grade.</li>"}</ul>

${other.length ? `<details class="more"><summary>Other improvements (${other.length})</summary>
  <ul class="actions">${other.map((c) => actionCard(c).replace('class="action"', 'class="action soft"')).join("")}</ul>
</details>` : ""}

<div class="cols">
  <section><h2>What worked</h2><div class="card"><ul>${d.strengths.map((s) => `<li>${esc(s)}</li>`).join("") || "<li class='muted'>—</li>"}</ul></div></section>
  <section><h2>Red flags an investor will raise</h2><div class="card"><ul>${d.red_flags.map((r) => `<li><b>${esc(r.issue)}</b>${r.quotes?.length ? `<ul class="quotes">${r.quotes.map((q) => `<li>“${esc(q)}”</li>`).join("")}</ul>` : ""}</li>`).join("") || "<li class='muted'>None found.</li>"}</ul></div></section>
</div>

<footer>
  <p><b>Not scored from a transcript:</b> ${d.notScored.map(esc).join(" · ")}.</p>
  <p>Source: ${esc(d.meta.source)} · ${d.meta.words} words · model ${esc(d.meta.model)} · agent v${esc(d.meta.agent)} · rubric v${esc(d.meta.rubric)} · ${esc(d.meta.hash)}</p>
  <p>Levels are AI-graded and every quote is checked against the transcript; points and the total are computed by code. Treat it as coaching, not an investment verdict.</p>
</footer>
</main></body></html>`;
}
