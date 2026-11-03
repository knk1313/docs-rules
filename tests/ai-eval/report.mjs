#!/usr/bin/env node
// tests/ai-eval/results/ の結果から、AIで判定するルールごとの検出率、誤検出、揺れをMarkdownの表で出す（#77）。
// モデルは呼ばない。使い方（リポジトリの直下から）: node tests/ai-eval/report.mjs
import { judge, loadAiPairs, loadResults, summarizeAi } from "../lib/ai-eval.mjs";

const results = loadResults();
if (results.length === 0) {
  process.stdout.write("結果がない。tests/ai-eval/README.md の手順で評価する\n");
  process.exit(0);
}
const models = [...new Set(results.map((r) => r.model))].sort();
for (const model of models) {
  const runs = results.filter((r) => r.model === model);
  const rows = summarizeAi(judge(loadAiPairs(), runs));
  const lines = [
    `## ${model}（${runs.length}回分、${[...new Set(runs.map((r) => r.date))].join("、")}）`,
    "",
    "| ルールID | 対 | 評価の回数 | 検出率 | 直した文での誤検出 | 揺れた対 | 直した文でのほかの指摘 |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) => `| ${r.rule_id} | ${r.pairs} | ${r.runs} | ${Math.round((r.detected / r.runs) * 100)}% | ${r.falsePositives} | ${r.unstable} | ${r.others} |`
    ),
  ];
  process.stdout.write(`${lines.join("\n")}\n\n`);
}
