#!/usr/bin/env node
// tests/corpus/ の対の文を採点し、ルールごとの検出率と誤検出の数をMarkdownの表で出す（#67）。
// 使い方（リポジトリの直下から）: node tests/corpus/report.mjs
import { evaluate, loadPairs, scorePairs, summarize } from "../lib/corpus.mjs";

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
