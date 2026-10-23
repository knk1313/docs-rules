// lib/exclusions.mjs の除外条件が、外すべき誤検出だけを外し、同じ場所にある本物の違反を外さないことを確かめる。
// score.mjs を実行せず、指摘を手で作って渡すため、npx がなくても動く。
import { test } from "node:test";
import assert from "node:assert/strict";
import { findExclusion } from "./lib/exclusions.mjs";

const RULES = "skills/docs-rules/rules/notation.md";

/** 指摘を作る。column は行の中の文字の位置（1始まり）から求める。 */
function finding(checker, line, excerpt) {
  const index = line.indexOf(excerpt);
  assert.ok(index >= 0, `例の行に「${excerpt}」がない: ${line}`);
  return { line: 1, column: index + 1, checker: `textlint：${checker}`, excerpt };
}

/** 1行だけの文書として除外条件に渡し、当たった除外条件の理由を返す。 */
function reasonFor(file, line, checker, excerpt) {
  return findExclusion(finding(checker, line, excerpt), line, { file, lines: [line] })?.reason;
}

// [説明, ファイル, 行, 判定手段, 指摘の文字列, 期待する除外条件（外さないなら undefined）]
const CASES = [
  // 出典欄：資料名の書き方に由来する指摘だけを外す
  ["出典欄の資料名と番号の間のスペース", RULES, "- 出典：JTFスタイルガイド 2.1.5", "ja-space-between-half-and-full-width", " ", "出典欄の資料名と箇所"],
  ["出典欄の項目番号の半角の括弧", RULES, "- 出典：公用文作成の考え方 Ⅱ5ウ(イ)", "jtf-style/4.3.1.丸かっこ（）", "(", "出典欄の資料名と箇所"],
  ["出典欄の全角数字は外さない", RULES, "- 出典：JTFスタイルガイド ２.1.5", "jtf-style/2.1.8.算用数字", "２", undefined],
  ["出典欄の半角カナは外さない", RULES, "- 出典：ｽﾀｲﾙガイド 2.1.5", "no-hankaku-kana", "ｽﾀｲﾙ", undefined],

  // 判定欄：ルール名の書き方に由来する指摘だけを外す
  ["判定欄のルール名の半角の括弧", RULES, "- 判定：機械（textlint：jtf-style/4.3.1.丸かっこ（）、jtf-style/4.2.4.中黒(・)）", "jtf-style/4.3.1.丸かっこ（）", "(", "判定欄のルール名"],
  ["判定欄のルール名の「.」", RULES, "- 判定：機械（textlint：jtf-style/1.2.1.句点(。)と読点(、)）", "jtf-style/1.2.1.句点(。)と読点(、)", ".", "判定欄のルール名"],
  ["判定欄の弱い言い切りは外さない", RULES, "- 判定：機械かもしれない", "ja-no-weak-phrase", "かもしれない", undefined],

  // 日本語を含まない行：日本語の文のための基準だけを外す
  ["英語の行の文の長さ", "README.md", "docs-rules is a Claude Code skill for writing Japanese documents.", "sentence-length", "docs-rules", "日本語を含まない行"],
  ["英語の行のカンマの数", "README.md", "It ships rules, schemas, templates, and tests.", "max-comma", ", and", "日本語を含まない行"],
  ["英語の行の全角英字は外さない", "README.md", "Install it with Ｃlaude Code.", "jtf-style/2.1.9.アルファベット", "Ｃ", undefined],

  // 「」の中：ルールを説明するファイルでだけ外す
  ["rules/の「」に例示した違反", RULES, "- 例：「更に色々な設定を変更出来る」→「さらにいろいろな設定を変更できる」", "prh", "更に", "「」の中の例示"],
  ["evaluators/の「」に例示した違反", "skills/docs-rules/evaluators/README.md", "- 例：「3千人」を指摘する", "docs-rules/not-013", "3千", "「」の中の例示"],
  ["README.mdの「」の中は外さない", "README.md", "このスキルは「設定を変更することができる」と書かない。", "ja-no-redundant-expression", "することができる", undefined],
  ["CONTRIBUTING.mdの「」の中は外さない", "CONTRIBUTING.md", "見出しは「追加」「変更」「修正」の３つにする。", "jtf-style/2.1.8.算用数字", "３", undefined],
  ["rules/でも「」の外は外さない", RULES, "- 例：「設定」を変更することができる", "ja-no-redundant-expression", "することができる", undefined],

  // 『』の中：題名は原文のまま写す
  ["『』の中の題名の「及び」", "README.md", "DS-441『コアデータパーツ 日付及び時刻』（デジタル庁）", "prh", "及び", "『』の中の題名"],
  ["『』の外の「及び」は外さない", "README.md", "日付及び時刻は『コアデータパーツ』に従う。", "prh", "及び", undefined],
];

for (const [title, file, line, checker, excerpt, expected] of CASES) {
  test(`exclusions: ${title}`, () => {
    assert.equal(reasonFor(file, line, checker, excerpt), expected);
  });
}

test("exclusions: examples.mdの失敗例の段落だけを外す", () => {
  const file = "skills/docs-rules/rules/examples.md";
  const lines = ["### 例1の失敗例", "", "> 原因かもしれない。", "", "### 例1の成功例", "", "> 原因かもしれない。"];
  const v = (lineNumber) => ({ line: lineNumber, column: 3, checker: "textlint：ja-no-weak-phrase", excerpt: "かもしれない" });
  assert.equal(findExclusion(v(3), lines[2], { file, lines })?.reason, "examples.mdの失敗例");
  assert.equal(findExclusion(v(7), lines[6], { file, lines }), undefined);
});
