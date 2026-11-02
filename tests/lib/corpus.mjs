// tests/corpus/ の対の文を evaluators/score.mjs で採点し、ルールごとの見逃しと誤検出を数える。
// corpus.test.mjs と corpus/report.mjs の両方で使う。
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const CORPUS_DIR = join(ROOT, "tests/corpus");
const PAIRS_DIR = join(CORPUS_DIR, "pairs");
const SCORE = join(ROOT, "skills/docs-rules/evaluators/score.mjs");

/** pairs/*.jsonl を読み、対の文を一覧で返す。各項目には、読んだファイルの名前を source_file として足す。 */
export function loadPairs() {
  const pairs = [];
  for (const file of readdirSync(PAIRS_DIR).filter((f) => f.endsWith(".jsonl")).sort()) {
    readFileSync(join(PAIRS_DIR, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.trim() === "") return;
        try {
          pairs.push({ ...JSON.parse(line), source_file: file });
        } catch (e) {
          throw new Error(`pairs/${file}:${i + 1} のJSONを読めない: ${e.message}`);
        }
      });
  }
  return pairs;
}

/** known.json（許した見逃しと誤検出の一覧）を読む。 */
export function loadKnown() {
  return JSON.parse(readFileSync(join(CORPUS_DIR, "known.json"), "utf8"));
}

/**
 * 文を採点する文書にする。見出し1（「# 」）で始まる文は、文書全体として書いたものとしてそのまま使う。
 * それ以外は、見出し1の後ろに置く。見出し1がないことによる MKD-002 の指摘を、すべての文で出さないため。
 */
function toDocument(text) {
  return text.startsWith("# ") ? `${text}\n` : `# 例\n\n${text}\n`;
}

/**
 * すべての対の文を、score.mjs の1回の呼び出しで採点する。
 * 返り値の code が 3 のときは、パッケージを入れられなかったことを示し、results は空になる。
 */
export function scorePairs(pairs) {
  const work = mkdtempSync(join(tmpdir(), "docs-rules-corpus-"));
  const files = [];
  for (const pair of pairs) {
    for (const side of ["violation", "fixed"]) {
      const file = join(work, `${pair.id}.${side}.md`);
      writeFileSync(file, toDocument(pair[side]));
      files.push(file);
    }
  }
  const r = spawnSync(process.execPath, [SCORE, ...files], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && r.status !== 1) return { code: r.status, stderr: r.stderr, results: new Map() };
  const parsed = JSON.parse(r.stdout);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const results = new Map(list.map((x, i) => [files[i], x.violations]));
  const byPair = new Map(
    pairs.map((pair) => [
      pair.id,
      {
        violation: results.get(join(work, `${pair.id}.violation.md`)),
        fixed: results.get(join(work, `${pair.id}.fixed.md`)),
      },
    ])
  );
  return { code: r.status, stderr: r.stderr, results: byPair };
}

/**
 * 採点の結果から、見逃しと誤検出を取り出す。
 * - 見逃し：違反した文に、期待したルールIDの指摘がない
 * - 誤検出：直した文に、何かの指摘がある。直した文は、どのルールにも違反しない文として書いているため
 */
export function evaluate(pairs, results) {
  const misses = [];
  const falsePositives = [];
  for (const pair of pairs) {
    const r = results.get(pair.id);
    if (!r.violation.some((v) => v.rule_id === pair.rule_id)) misses.push({ id: pair.id, rule_id: pair.rule_id });
    for (const v of r.fixed) falsePositives.push({ id: pair.id, rule_id: v.rule_id, excerpt: v.excerpt });
  }
  return { misses, falsePositives };
}

/** ルールごとに、対の数、見つけた数、直した文での誤検出の数をまとめる。 */
export function summarize(pairs, { misses, falsePositives }) {
  const rows = new Map();
  for (const pair of pairs) {
    if (!rows.has(pair.rule_id)) rows.set(pair.rule_id, { rule_id: pair.rule_id, pairs: 0, detected: 0, falsePositives: 0 });
    const row = rows.get(pair.rule_id);
    row.pairs += 1;
    if (!misses.some((m) => m.id === pair.id)) row.detected += 1;
    row.falsePositives += falsePositives.filter((f) => f.id === pair.id).length;
  }
  return [...rows.values()].sort((a, b) => a.rule_id.localeCompare(b.rule_id));
}
