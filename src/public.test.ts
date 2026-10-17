// Publish guard: fails `bun test` if a file that would be published contains a local path, an email
// address, or a term from the optional, git-ignored `.publiccheck-denylist` (one term per line).
import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SKIP_DIRS = new Set([".git", "node_modules", "reports", "transcripts"]);
const SKIP_FILES = new Set([".publiccheck-denylist", "public.test.ts"]);
const GENERATED = /-[0-9a-f]{12}\.(html|json)$/; // reports written next to transcripts (git-ignored)
const TEXT = /\.(md|json|ts|txt|html|ya?ml)$|^(LICENSE|\.gitignore)$/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return SKIP_DIRS.has(name) ? [] : files(p);
    if (SKIP_FILES.has(name) || GENERATED.test(name) || !TEXT.test(name)) return [];
    if (/\.(vtt|srt)$/.test(name)) return [];
    return [p];
  });
}

const RULES: [string, RegExp][] = [
  ["local Windows path", /\b[A-Z]:[\\/]/],
  ["local user folder", /[\\/](Users|home)[\\/][^\s"'`]+/],
  ["email address", /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/],
];

const denyPath = join(ROOT, ".publiccheck-denylist");
const deny = existsSync(denyPath)
  ? readFileSync(denyPath, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  : [];

test("published files contain no local paths, emails or denylisted terms", () => {
  const hits: string[] = [];
  for (const f of files(ROOT)) {
    const text = readFileSync(f, "utf8");
    const rel = relative(ROOT, f);
    for (const [label, re] of RULES) {
      const m = text.match(re);
      if (m) hits.push(`${rel}: ${label} → ${m[0]}`);
    }
    // Denylist terms match as whole words, ignoring case, except ALL-CAPS terms, which match exactly
    // (so "HERO" doesn't flag a CSS class named "hero")
    for (const term of deny) {
      const flags = term === term.toUpperCase() ? "" : "i";
      const re = new RegExp(`(^|[^A-Za-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`, flags);
      if (re.test(text)) hits.push(`${rel}: denylisted term → ${term}`);
    }
  }
  expect(hits).toEqual([]);
});
