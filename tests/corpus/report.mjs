#!/usr/bin/env node
// tests/corpus/ の対の文を採点し、ルールごとの検出率と誤検出の数をMarkdownの表で出す（#67）。
// 人が書いた段落については、記録した指摘の判断をルールごとに数えて出す。
// 使い方（リポジトリの直下から）: node tests/corpus/report.mjs
import { HUMAN_LABELS, evaluate, loadHuman, loadPairs, scorePairs, summarize, summarizeHuman } from "../lib/corpus.mjs";

const pairs = loadPairs();
const { code, stderr, results } = scorePairs(pairs);
if (code !== 0 && code !== 1) {
  process.stderr.write(`採点できなかった（終了コード ${code}）: ${stderr}`);
  process.exit(code ?? 1);
}
const outcome = evaluate(pairs, results);
const rows = summarize(pairs, outcome);

const lines = ["| ルールID | 対の数 | 見つけた数 | 検出率 | 直した文での誤検出 |", "| --- | --- | --- | --- | --- |"];
for (const row of rows) {
  const rate = Math.round((row.detected / row.pairs) * 100);
  lines.push(`| ${row.rule_id} | ${row.pairs} | ${row.detected} | ${rate}% | ${row.falsePositives} |`);
}
const total = rows.reduce((sum, r) => ({ pairs: sum.pairs + r.pairs, detected: sum.detected + r.detected, fp: sum.fp + r.falsePositives }), { pairs: 0, detected: 0, fp: 0 });
lines.push(`| 合計 | ${total.pairs} | ${total.detected} | ${Math.round((total.detected / total.pairs) * 100)}% | ${total.fp} |`);
process.stdout.write(`${lines.join("\n")}\n`);

if (outcome.misses.length > 0) {
  process.stdout.write(`\n見逃し:\n${outcome.misses.map((m) => `- ${m.id}`).join("\n")}\n`);
}
if (outcome.falsePositives.length > 0) {
  process.stdout.write(`\n直した文での誤検出:\n${outcome.falsePositives.map((f) => `- ${f.id} ${f.rule_id ?? "-"}「${f.excerpt}」`).join("\n")}\n`);
}

// 人が書いた段落は、記録した findings の判断を数える。採点し直さないため、findings が古いときは corpus.test.mjs で確かめる
const human = loadHuman();
const humanRows = summarizeHuman(human);
const humanLines = [
  `\n人が書いた段落（${human.length}件）での指摘:\n`,
  `| ルールID | ${HUMAN_LABELS.join(" | ")} |`,
  `| --- | ${HUMAN_LABELS.map(() => "---").join(" | ")} |`,
  ...humanRows.map((row) => `| ${row.rule_id} | ${HUMAN_LABELS.map((l) => row[l]).join(" | ")} |`),
];
process.stdout.write(`${humanLines.join("\n")}\n`);

// 出典ごとの誤検出の数。文体（行政の説明、白書の分析、手続きの案内）による差を見る（#75）
const sources = [...new Set(human.map((item) => item.source_file))].sort();
const bySource = sources.map((file) => {
  const items = human.filter((item) => item.source_file === file);
  const rows = summarizeHuman(items).filter((row) => row["誤検出"] > 0);
  const detail = rows.map((row) => `${row.rule_id} ${row["誤検出"]}件`).join("、") || "なし";
  const total = rows.reduce((sum, row) => sum + row["誤検出"], 0);
  return `| ${file} | ${items.length} | ${total} | ${detail} |`;
});
process.stdout.write(`\n出典ごとの誤検出:\n\n| 出典 | 段落 | 誤検出 | 内訳 |\n| --- | --- | --- | --- |\n${bySource.join("\n")}\n`);
