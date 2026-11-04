#!/usr/bin/env node
// tests/ai-eval/results/ の結果から、AIで判定するルールごとの検出率、誤検出、揺れをMarkdownの表で出す（#77）。
// モデルは呼ばない。使い方（リポジトリの直下から）: node tests/ai-eval/report.mjs
import { judge, loadAiPairs, loadHumanResults, loadResults, summarizeAi } from "../lib/ai-eval.mjs";

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

// 人が書いた文書は正解のラベルがないため、ルールごと、出典ごとの指摘の数だけを出す。
// 対の文の検出率と比べて、AI評価が人の文書で指摘しすぎていないか、しなさすぎていないかを見る
for (const run of loadHumanResults()) {
  const sources = [...new Set(Object.keys(run.documents).map((id) => id.split("-")[0]))].sort();
  const counts = new Map();
  for (const [id, findings] of Object.entries(run.documents)) {
    for (const f of findings) {
      if (!counts.has(f.rule_id)) counts.set(f.rule_id, Object.fromEntries(sources.map((s) => [s, 0])));
      counts.get(f.rule_id)[id.split("-")[0]] += 1;
    }
  }
  const lines = [
    `## 人が書いた文書：${run.model}（${run.date}、${Object.keys(run.documents).length}段落）`,
    "",
    `| ルールID | ${sources.join(" | ")} |`,
    `| --- | ${sources.map(() => "---").join(" | ")} |`,
    ...[...counts].sort(([a], [b]) => a.localeCompare(b)).map(([id, c]) => `| ${id} | ${sources.map((s) => c[s]).join(" | ")} |`),
  ];
  process.stdout.write(`${lines.join("\n")}\n\n`);
}
