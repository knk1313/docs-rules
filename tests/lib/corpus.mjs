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
const HUMAN_DIR = join(CORPUS_DIR, "human");
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

/** human/*.jsonl を読み、人が書いた段落を一覧で返す。各項目には、読んだファイルの名前を source_file として足す。 */
export function loadHuman() {
  const items = [];
  for (const file of readdirSync(HUMAN_DIR).filter((f) => f.endsWith(".jsonl")).sort()) {
    readFileSync(join(HUMAN_DIR, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.trim() === "") return;
        try {
          items.push({ ...JSON.parse(line), source_file: file });
        } catch (e) {
          throw new Error(`human/${file}:${i + 1} のJSONを読めない: ${e.message}`);
        }
      });
  }
  return items;
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
 * 人が書いた段落を、score.mjs の1回の呼び出しで採点する。
 * 返り値の results は、段落のidから指摘の一覧への対応である。code が 3 のときは空になる。
 */
export function scoreHuman(items) {
  const work = mkdtempSync(join(tmpdir(), "docs-rules-human-"));
  const files = items.map((item) => {
    const file = join(work, `${item.id}.md`);
    writeFileSync(file, toDocument(item.text));
    return file;
  });
  const r = spawnSync(process.execPath, [SCORE, ...files], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && r.status !== 1) return { code: r.status, stderr: r.stderr, results: new Map() };
  const parsed = JSON.parse(r.stdout);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return { code: r.status, stderr: r.stderr, results: new Map(items.map((item, i) => [item.id, list[i].violations])) };
}

/** 指摘を突き合わせるための鍵。ルールIDのない指摘もあるため、判定手段、段落の中の桁、該当箇所で見分ける。 */
export const findingKey = (f) => `${f.checker}\t${f.column}\t${f.excerpt ?? ""}`;

/**
 * 人が書いた段落の採点結果を、各段落の findings（記録した指摘とその判断）と突き合わせる。
 * - unrecorded：採点で出たのに、findings にない指摘
 * - stale：findings にあるのに、採点で出なくなった指摘
 */
export function compareHuman(items, results) {
  const unrecorded = [];
  const stale = [];
  for (const item of items) {
    const left = (results.get(item.id) ?? []).map(findingKey);
    for (const f of item.findings) {
      const i = left.indexOf(findingKey(f));
      if (i === -1) stale.push({ id: item.id, ...f });
      else left.splice(i, 1);
    }
    for (const key of left) unrecorded.push({ id: item.id, key });
  }
  return { unrecorded, stale };
}

/** findings の label に使う値。 */
export const HUMAN_LABELS = ["違反", "誤検出", "ルール外", "要確認"];

/** 人が書いた段落の findings を、ルールごとに label の値で数える。ルールIDのない指摘は、判定手段ごとに数える。 */
export function summarizeHuman(items) {
  const rows = new Map();
  for (const item of items) {
    for (const f of item.findings) {
      const id = f.rule_id ?? f.checker;
      if (!rows.has(id)) rows.set(id, { rule_id: id, ...Object.fromEntries(HUMAN_LABELS.map((l) => [l, 0])) });
      rows.get(id)[f.label] += 1;
    }
  }
  return [...rows.values()].sort((a, b) => a.rule_id.localeCompare(b.rule_id));
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
