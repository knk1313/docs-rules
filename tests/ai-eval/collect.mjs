#!/usr/bin/env node
// サブエージェントが書き出した評価の結果（文書ごとのJSON）を、1回分の結果のファイルにまとめる（#77）。
// 使い方（リポジトリの直下から）:
//   node tests/ai-eval/collect.mjs <結果のディレクトリ> --model <モデル> --run <回> --rule-file <ルールのファイル名>
//   node tests/ai-eval/collect.mjs <結果のディレクトリ> --model <モデル> --run <回> --human
// 結果のディレクトリには、評価した文書ごとに <文書の名前>.json（prompts/evaluate.md の出力の形）を置く。
// 対の文の結果は tests/ai-eval/results/<日付>-<ルールのファイル名>-<モデル>-r<回>.json に、
// 人が書いた文書の結果は tests/ai-eval/human-results/<日付>-<モデル>-r<回>.json に書く。
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { HUMAN_RESULTS_DIR, RESULTS_DIR } from "../lib/ai-eval.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const dir = args[0];
const model = option("model");
const run = Number(option("run"));
const ruleFile = option("rule-file");
const human = args.includes("--human");
if (!dir || !model || !Number.isInteger(run) || run < 1 || (!ruleFile && !human)) {
  process.stderr.write("使い方: node tests/ai-eval/collect.mjs <結果のディレクトリ> --model <モデル> --run <回> (--rule-file <ルールのファイル名> | --human)\n");
  process.exit(2);
}

const documents = {};
const problems = [];
for (const file of readdirSync(resolve(dir)).filter((f) => f.endsWith(".md.json")).sort()) {
  try {
    const out = JSON.parse(readFileSync(join(resolve(dir), file), "utf8"));
    if (!Array.isArray(out.violations)) throw new Error("violations が配列でない");
    const name = file.replace(/\.json$/, "");
    if (human) {
      // 人が書いた文書は正解のラベルがないため、後で判断できるよう該当箇所も残す
      documents[name.replace(/\.md$/, "")] = out.violations.map((v) => ({ rule_id: v.rule_id, excerpt: v.excerpt }));
    } else {
      // 回ごとの比べやすさのため、指摘したルールIDだけを残す。同じルールの指摘が複数あっても1つにする
      documents[name] = [...new Set(out.violations.map((v) => v.rule_id))].sort();
    }
  } catch (e) {
    problems.push(`${file}: ${e.message}`);
  }
}
if (problems.length > 0) {
  process.stderr.write(`読めない結果がある:\n${problems.join("\n")}\n`);
  process.exit(2);
}

const date = new Date().toISOString().slice(0, 10);
const outDir = human ? HUMAN_RESULTS_DIR : RESULTS_DIR;
mkdirSync(outDir, { recursive: true });
const out = join(outDir, human ? `${date}-${model}-r${run}.json` : `${date}-${ruleFile}-${model}-r${run}.json`);
const body = human ? { model, date, run, documents } : { model, date, run, rule_file: ruleFile, documents };
writeFileSync(out, `${JSON.stringify(body, null, 2)}\n`);
process.stdout.write(`${out}（文書 ${Object.keys(documents).length} 件）\n`);
