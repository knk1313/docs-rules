#!/usr/bin/env node
// rules/*.md から、AI評価で読むルールだけを抜き出して prompts/ai-rules.md に書く。
// AI評価（evaluate.md）は rules/ のファイルをすべて読む代わりにこのファイルを読み、読む量を減らす。
// 抜き出すのは次の二つ。
// - 判定：AI のルール：ルールの全文（項目と注記）
// - 判定：機械 のルールのうち、注記に「AI評価で扱う」とあるもの：見出し、「ルール」の項目、その言い回しのある注記の文
// 使い方（リポジトリの直下から）:
//   node skills/docs-rules/prompts/tools/build-ai-rules.mjs          … ai-rules.md を書き直す
//   node skills/docs-rules/prompts/tools/build-ai-rules.mjs --check  … ai-rules.md が古ければ終了コード1にする
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const RULES_DIR = join(PROMPTS_DIR, "..", "rules");
const OUT = join(PROMPTS_DIR, "ai-rules.md");
const AI_PHRASE = "AI評価で扱う";

/** ルールのファイルを、### の見出しごとの塊に分ける。 */
function ruleBlocks(text) {
  const blocks = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (/^#{1,3} /.test(line)) {
      current = /^### [A-Z]+-\d{3} /.test(line) ? { heading: line, lines: [] } : null;
      if (current) blocks.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  return blocks;
}

/** 塊から、AI評価で読む部分を取り出す。読む部分がなければ null を返す。 */
function aiPart({ heading, lines }) {
  const judge = lines.find((l) => l.startsWith("- 判定："));
  if (!judge) return null;
  const body = lines.join("\n").trim();
  if (judge === "- 判定：AI") return `${heading}\n\n${body}`;
  const notes = lines
    .filter((l) => l.startsWith(">") && l.includes(AI_PHRASE))
    .map((l) => l.replace(/^>\s*/, ""))
    .map((l) => `> ${l}`);
  if (notes.length === 0) return null;
  const rule = lines.find((l) => l.startsWith("- ルール："));
  return [heading, "", rule, `- 判定：${judge.slice("- 判定：".length)}。注記のうち、次の部分だけをAIで評価する`, "", notes.join("\n>\n")].join("\n");
}

function build() {
  const files = readdirSync(RULES_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "examples.md")
    .sort();
  const parts = [
    "# AI評価で読むルール",
    "",
    "<!-- prompts/tools/build-ai-rules.mjs で rules/ から生成した。手で直さない。ルールを直したら作り直す -->",
    "",
    "[evaluate.md](evaluate.md)で評価に使うルールを、`rules/`から抜き出したもの。`判定：AI`のルールは全文を、`判定：機械`のルールは「AI評価で扱う」とした注記だけを載せる。それ以外の`判定：機械`のルールは`evaluators/score.mjs`が採点するため、ここには載せない。",
  ];
  for (const file of files) {
    const blocks = ruleBlocks(readFileSync(join(RULES_DIR, file), "utf8")).map(aiPart).filter(Boolean);
    if (blocks.length === 0) continue;
    parts.push("", `## ${file}`, "", blocks.join("\n\n"));
  }
  return `${parts.join("\n")}\n`;
}

const text = build();
if (process.argv.includes("--check")) {
  const current = readFileSync(OUT, "utf8");
  if (current !== text) {
    process.stderr.write("prompts/ai-rules.md が rules/ と合っていない。build-ai-rules.mjs で作り直す\n");
    process.exit(1);
  }
} else {
  writeFileSync(OUT, text);
  process.stdout.write(`${OUT}（${text.length}字）\n`);
}
