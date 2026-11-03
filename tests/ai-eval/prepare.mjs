#!/usr/bin/env node
// AI評価で評価する文書を書き出す（#77）。手順は tests/ai-eval/README.md を参照。
// 使い方（リポジトリの直下から）: node tests/ai-eval/prepare.mjs <書き出す先> [<ルールのファイル名>]
// 例: node tests/ai-eval/prepare.mjs /tmp/ai-eval forbidden-words
import { resolve } from "node:path";
import { prepare } from "../lib/ai-eval.mjs";

const [dir, ruleFile] = process.argv.slice(2);
if (!dir) {
  process.stderr.write("使い方: node tests/ai-eval/prepare.mjs <書き出す先> [<ルールのファイル名>]\n");
  process.exit(2);
}
const names = prepare(resolve(dir), ruleFile);
if (names.length === 0) {
  process.stderr.write(`対の文がない: ${ruleFile ?? "(すべて)"}\n`);
  process.exit(2);
}
process.stdout.write(`${names.join("\n")}\n`);
