// Locks the HTML report format. Whatever LLM produced the grading (Claude, Gemini, GPT, local), the
// report is rendered by code from validated JSON, so the layout below must hold. To change the format
// on purpose, edit src/render.ts, then run `bun test --update-snapshots` and `bun scripts/build.ts`.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { finalize, parseGrading } from "./portable";
import { buildBundle, schemaJson } from "../scripts/build";
import { exampleReport, htmlSystemPrompt } from "../scripts/html-prompt";

const ROOT = join(import.meta.dir, "..");
const transcript = readFileSync(join(ROOT, "samples", "strong-pitch.txt"), "utf8");
const gradingText = readFileSync(join(import.meta.dir, "fixtures", "grading.strong.json"), "utf8");
const fixed = { transcript, source: "strong-pitch.txt", date: "2026-01-01", hash: "fixture" };
const render = (grading: unknown, model = "any-model") => finalize({ ...fixed, grading, model });

test("report HTML matches the locked snapshot", () => {
  const out = render(JSON.parse(gradingText));
  expect(out.ok).toBe(true);
  expect(out.html).toMatchSnapshot();
});

test("sections appear in the fixed order and grader flags are not shown", () => {
  const html = render(JSON.parse(gradingText)).html!;
  const order = ['class="card hero"', ">Score breakdown</h2>", ">Must-have actions to improve your pitch</h2>",
    '<details class="more">', '<div class="cols">', ">What worked</h2>", ">Red flags an investor will raise</h2>", "<footer>"];
  const positions = order.map((m) => html.indexOf(m));
  positions.forEach((p, i) => expect(p, `missing: ${order[i]}`).toBeGreaterThan(-1));
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  expect(html).not.toContain("Grader flags");
});

test("same layout whatever the model and however it wraps its JSON", () => {
  const base = render(JSON.parse(gradingText), "model-a").html!;
  const styles = [
    gradingText,                                                // raw JSON text
    "```json\n" + gradingText + "\n```",                         // fenced, as many chat models reply
    "Here is the grading you asked for:\n" + gradingText + "\nLet me know if you need more.", // prose around it
    JSON.parse(gradingText.replace('"level": 3', '"level": "3"')), // numeric-string level
  ];
  for (const s of styles) {
    const out = render(s, "model-b");
    expect(out.ok, out.errors.join("; ")).toBe(true);
    expect(out.html!.replaceAll("model-b", "model-a")).toBe(base);
  }
});

test("HTML or markup written by the model is escaped, never rendered", () => {
  const g = JSON.parse(gradingText);
  g.summary = '<script>alert(1)</script><h1 style="color:red">Score 100</h1>';
  const html = render(g).html!;
  expect(html).not.toContain("<script>alert(1)");
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("invalid model output is rejected instead of rendered", () => {
  expect(parseGrading("<html><body>Score: 90%</body></html>").grading).toBeNull();
  expect(parseGrading('{"is_pitch": true}').grading).toBeNull();
  const bad = JSON.parse(gradingText); bad.criteria[0].level = 7;
  expect(parseGrading(bad).errors.some((e) => e.includes("level out of range"))).toBe(true);
  expect(render("not json at all").ok).toBe(false);
});

test("built artifacts are up to date with the source", async () => {
  expect(readFileSync(join(ROOT, "dist", "what-are-you-building.js"), "utf8")).toBe(await buildBundle());
  expect(readFileSync(join(ROOT, "schema", "grading.schema.json"), "utf8")).toBe(schemaJson());
});

test("prompt/SYSTEM.md (direct-HTML path, e.g. n8n) is up to date and embeds the renderer's exact layout", () => {
  const systemMd = readFileSync(join(ROOT, "prompt", "SYSTEM.md"), "utf8");
  expect(systemMd).toBe(htmlSystemPrompt());
  const example = systemMd.split("```html\n")[1].split("\n```")[0];
  expect(example).toBe(exampleReport());
  const style = (h: string) => h.slice(h.indexOf("<style>"), h.indexOf("</style>"));
  expect(style(example)).toBe(style(render(JSON.parse(gradingText)).html!));
  expect(systemMd).toContain("Return only the HTML document");
  expect(systemMd).not.toContain("return JSON only");
});

test("the standalone bundle renders exactly the same HTML outside Bun", () => {
  const sandbox: any = {};
  new Function("globalThis", readFileSync(join(ROOT, "dist", "what-are-you-building.js"), "utf8"))(sandbox);
  const out = sandbox.WhatAreYouBuilding.finalize({ ...fixed, grading: gradingText, model: "any-model" });
  expect(out.html).toBe(render(JSON.parse(gradingText)).html);
});
