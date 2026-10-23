#!/usr/bin/env node
// 書き直しの前後の採点結果を比べる（#24）。
//
// 使い方（リポジトリの直下から）:
//   node skills/docs-rules/evaluators/compare.mjs <最初の採点結果> ... <前回の採点結果> <今回の採点結果>
//
// score.mjs が出力した JSON を、採点した順に2つ以上渡す。前回と今回を比べて、直った違反、残った違反、
// 新しく出た違反を返す。直近3回の結果すべてにある違反（2回続けて書き直した後も残った違反）も返す。
// 比べるのは judge が「機械」の違反だけである。AI 評価の excerpt は実行ごとに切り出し方が変わるため比べない。
// 同じ違反かどうかは rule_id（null のときは checker）と excerpt の組で決める。line は書き直しでずれるため使わない。
//
// 終了コード:
//   0 比べられた / 2 引数の誤り（ファイルが2つ未満、読めない、JSON でない）

import { readFileSync } from "node:fs";

const EXIT_OK = 0;
const EXIT_USAGE = 2;

/** 違反を見分ける鍵。 */
function keyOf(v) {
  return `${v.rule_id ?? v.checker}\u0000${v.excerpt}`;
}

/** 採点結果から機械判定の違反を取り出し、鍵ごとに並べる。同じ鍵の違反が複数あれば出た順に並べる。 */
function groupMachine(result) {
  const groups = new Map();
  for (const v of result.violations ?? []) {
    if (v.judge !== "機械") continue;
    const key = keyOf(v);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }
  return groups;
}

/**
 * base にあって other にない違反を返す。同じ鍵の違反は件数で比べ、多い分だけを返す。
 * 「ヶ」が3か所から1か所に減ったときは、2件を返す。
 */
function difference(base, other) {
  const out = [];
  for (const [key, list] of base) {
    const rest = list.length - (other.get(key)?.length ?? 0);
    if (rest > 0) out.push(...list.slice(list.length - rest));
  }
  return out;
}

/** groups のすべてにある違反を、最後の groups の違反で返す。同じ鍵の違反は、最も少ない件数だけを返す。 */
function intersection(groupsList) {
  const last = groupsList[groupsList.length - 1];
  const out = [];
  for (const [key, list] of last) {
    const count = Math.min(...groupsList.map((g) => g.get(key)?.length ?? 0));
    if (count > 0) out.push(...list.slice(0, count));
  }
  return out;
}

/** 採点結果の一覧（採点した順）を比べる。 */
function compare(results) {
  const groups = results.map(groupMachine);
  const first = groups[0];
  const previous = groups[groups.length - 2];
  const current = groups[groups.length - 1];
  return {
    rewrites: results.length - 1,
    fixed: difference(previous, current),
    remaining: intersection([previous, current]),
    new: difference(current, previous),
    stuck: groups.length >= 3 ? intersection(groups.slice(-3)) : [],
    fixed_total: difference(first, current),
  };
}

function main() {
  const files = process.argv.slice(2);
  if (files.includes("-h") || files.includes("--help")) {
    process.stdout.write("使い方: node compare.mjs <最初の採点結果> ... <前回の採点結果> <今回の採点結果>\n");
    return EXIT_OK;
  }
  if (files.length < 2) {
    process.stderr.write("採点結果のJSONを、採点した順に2つ以上渡す\n");
    return EXIT_USAGE;
  }
  const results = [];
  for (const file of files) {
    try {
      results.push(JSON.parse(readFileSync(file, "utf8")));
    } catch (e) {
      process.stderr.write(`採点結果を読めない: ${file}（${e.message}）\n`);
      return EXIT_USAGE;
    }
  }
  const out = { files, ...compare(results) };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  return EXIT_OK;
}

process.exitCode = main();
