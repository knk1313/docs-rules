#!/usr/bin/env node
// AI評価で評価する文書を書き出す（#77）。手順は tests/ai-eval/README.md を参照。
// 使い方（リポジトリの直下から）:
//   node tests/ai-eval/prepare.mjs <書き出す先> [<ルールのファイル名>]   … 対の文
//   node tests/ai-eval/prepare.mjs <書き出す先> --human <出典ごとの件数>  … 人が書いた文書の段落
// 例: node tests/ai-eval/prepare.mjs /tmp/ai-eval forbidden-words
import { resolve } from "node:path";
import { prepare, prepareHuman } from "../lib/ai-eval.mjs";
import { loadHuman } from "../lib/corpus.mjs";

const args = process.argv.slice(2);
const dir = args[0];
if (!dir) {
  process.stderr.write("使い方: node tests/ai-eval/prepare.mjs <書き出す先> [<ルールのファイル名> | --human <出典ごとの件数>]\n");
  process.exit(2);
}
const human = args.indexOf("--human");
const names = human === -1 ? prepare(resolve(dir), args[1]) : prepareHuman(resolve(dir), Number(args[human + 1]) || 10, loadHuman);
if (names.length === 0) {
  process.stderr.write("書き出す文書がない\n");
  process.exit(2);
}
process.stdout.write(`${names.join("\n")}\n`);
