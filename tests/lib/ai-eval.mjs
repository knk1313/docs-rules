// tests/ai-eval/ の対の文を、AI評価（prompts/evaluate.md）で評価するための準備と集計（#77）。
// 評価そのものは、手元のClaude Codeのセッションのサブエージェントが行う。このファイルはモデルを呼ばない。
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./corpus.mjs";

export const AI_EVAL_DIR = join(ROOT, "tests/ai-eval");
const PAIRS_DIR = join(AI_EVAL_DIR, "pairs");
export const RESULTS_DIR = join(AI_EVAL_DIR, "results");

/** JSONLのファイルを読む。 */
function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        throw new Error(`${path}:${i + 1} のJSONを読めない: ${e.message}`);
      }
    });
}

/** pairs/*.jsonl を読む。各項目には、読んだファイルの名前を source_file として足す。 */
export function loadAiPairs() {
  return readdirSync(PAIRS_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .flatMap((file) => readJsonl(join(PAIRS_DIR, file)).map((p) => ({ ...p, source_file: file })));
}

/** 評価する文書の名前。対のidと、違反した文か直した文かで決まる。 */
export const docName = (id, side) => `${id}.${side}.md`;

/**
 * 対の文を、評価する文書として dir に書き出す。文は見出し1の後ろに置く（tests/corpus/ と同じ）。
 * ruleFile を渡したときは、そのルールのファイルの対だけを書き出す。書き出した文書の名前の一覧を返す。
 */
export function prepare(dir, ruleFile) {
  mkdirSync(dir, { recursive: true });
  const names = [];
  for (const pair of loadAiPairs()) {
    if (ruleFile && pair.source_file !== `${ruleFile}.jsonl`) continue;
    for (const side of ["violation", "fixed"]) {
      const name = docName(pair.id, side);
      writeFileSync(join(dir, name), `# 例\n\n${pair[side]}\n`);
      names.push(name);
    }
  }
  return names;
}

export const HUMAN_RESULTS_DIR = join(AI_EVAL_DIR, "human-results");

/**
 * 人が書いた文書（tests/corpus/human/）の段落を、評価する文書として dir に書き出す。
 * 出典ごとに、先頭から間を空けて perSource 件ずつ取る。書き出した文書の名前（<段落のid>.md）の一覧を返す。
 */
export function prepareHuman(dir, perSource, loadHuman) {
  mkdirSync(dir, { recursive: true });
  const bySource = new Map();
  for (const item of loadHuman()) {
    if (!bySource.has(item.source_file)) bySource.set(item.source_file, []);
    bySource.get(item.source_file).push(item);
  }
  const names = [];
  for (const items of bySource.values()) {
    const step = Math.max(1, Math.floor(items.length / perSource));
    for (let i = 0; i < items.length && names.filter((n) => n.startsWith(items[0].id.split("-")[0])).length < perSource; i += step) {
      const name = `${items[i].id}.md`;
      writeFileSync(join(dir, name), `# 例\n\n${items[i].text}\n`);
      names.push(name);
    }
  }
  return names;
}

/** human-results/*.json を読む。人が書いた文書をAIで評価した結果で、正解のラベルは持たない。 */
export function loadHumanResults() {
  if (!existsSync(HUMAN_RESULTS_DIR)) return [];
  return readdirSync(HUMAN_RESULTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ ...JSON.parse(readFileSync(join(HUMAN_RESULTS_DIR, file), "utf8")), result_file: file }));
}

/** results/*.json を読む。各ファイルは1回の評価の結果である。 */
export function loadResults() {
  if (!existsSync(RESULTS_DIR)) return [];
  return readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ ...JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8")), result_file: file }));
}

/**
 * 結果から、対ごと、回ごとの判定を取り出す。
 * - detected：違反した文に、期待したルールIDの指摘がある
 * - falsePositive：直した文に、期待したルールIDの指摘がある
 * - others：直した文に出た、ほかのルールIDの指摘（短い文では構成のルールが当たりやすいため、別に数える）
 * 結果に入っていない文書は、その回では評価していないものとして飛ばす。
 */
export function judge(pairs, results) {
  const rows = [];
  for (const pair of pairs) {
    for (const run of results) {
      const v = run.documents[docName(pair.id, "violation")];
      const f = run.documents[docName(pair.id, "fixed")];
      if (!v || !f) continue;
      rows.push({
        id: pair.id,
        rule_id: pair.rule_id,
        run: run.result_file,
        detected: v.includes(pair.rule_id),
        falsePositive: f.includes(pair.rule_id),
        others: f.filter((id) => id !== pair.rule_id),
      });
    }
  }
  return rows;
}

/** ルールごとに、検出率、誤検出、揺れ（回によって検出の結果が変わった対の数）をまとめる。 */
export function summarizeAi(rows) {
  const byRule = new Map();
  for (const row of rows) {
    if (!byRule.has(row.rule_id)) byRule.set(row.rule_id, []);
    byRule.get(row.rule_id).push(row);
  }
  return [...byRule].sort(([a], [b]) => a.localeCompare(b)).map(([rule_id, rs]) => {
    const byPair = new Map();
    for (const r of rs) {
      if (!byPair.has(r.id)) byPair.set(r.id, []);
      byPair.get(r.id).push(r);
    }
    const unstable = [...byPair.values()].filter(
      (runs) => new Set(runs.map((r) => r.detected)).size > 1 || new Set(runs.map((r) => r.falsePositive)).size > 1
    ).length;
    return {
      rule_id,
      pairs: byPair.size,
      runs: rs.length,
      detected: rs.filter((r) => r.detected).length,
      falsePositives: rs.filter((r) => r.falsePositive).length,
      others: rs.reduce((n, r) => n + r.others.length, 0),
      unstable,
    };
  });
}
