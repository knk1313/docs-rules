// repo-lint.test.mjs で使う除外条件。ルールの型に由来する誤検出だけを外す。
// 除外は「場所」と「判定手段」の両方で絞る。行全体や括弧の中全体を外すと、同じ場所にある本物の違反も見逃すため。
// 除外が効きすぎていないことは exclusions.test.mjs で、使われていない除外がないことは repo-lint.test.mjs で確かめる。

/**
 * 行の中の括弧（既定は「」）で囲まれた範囲を、[開始, 終了] の桁（1始まり）の組で返す。
 * 入れ子の同じ括弧は外側の範囲に含める。
 */
export function quotedRanges(line, open = "「", close = "」") {
  const ranges = [];
  let depth = 0;
  let start = 0;
  Array.from(line).forEach((ch, i) => {
    if (ch === open) {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (ch === close && depth > 0) {
      depth -= 1;
      if (depth === 0) ranges.push([start, i + 1]);
    }
  });
  return ranges;
}

/** 桁を、文字単位（サロゲートペアを1字と数える）に直す。score.mjs の桁はUTF-16の単位のため。 */
export function charColumn(line, column) {
  return Array.from(line.slice(0, column - 1)).length + 1;
}

/** 指摘の位置が、行の中の括弧で囲まれた範囲の内側にあるかを判定する。 */
function insideQuotes(v, line, open, close) {
  if (!v.column) return false;
  const col = charColumn(line, v.column);
  return quotedRanges(line, open, close).some(([s, e]) => col > s && col < e);
}

/** examples.md で、その行が「### …の失敗例」の節の中にあるかを判定する。 */
function inFailureExample(ctx, lineNumber) {
  if (!ctx.file.endsWith("rules/examples.md")) return false;
  for (let i = lineNumber - 1; i >= 0; i -= 1) {
    const m = ctx.lines[i].match(/^#{1,3} (.+)$/);
    if (m) return m[1].endsWith("の失敗例");
  }
  return false;
}

/** 判定手段の名前の集合を作る。score.mjs の checker は「textlint：<ルール名>」の形である。 */
const textlint = (...names) => new Set(names.map((n) => `textlint：${n}`));

// 出典欄で誤検出になる判定手段。出典欄は rules/README.md の略称の表の書き方に従うデータで、
// 資料名と項目番号の間のスペース（「JTFスタイルガイド 2.1.5」）、項目番号の半角の括弧（「Ⅱ5ウ(イ)」）、
// 英語の資料の節の区切り（「Accessibility > Tables」）を含む
const SOURCE_CHECKERS = textlint(
  "ja-space-between-half-and-full-width",
  "ja-no-space-between-full-width",
  "jtf-style/4.3.1.丸かっこ（）",
  "jtf-style/4.3.7.山かっこ<>"
);

// 判定欄で誤検出になる判定手段。判定欄はルール名を並べたデータで、ルール名に半角の括弧や「.」「。」を含み（NOT-025の注記）、
// 判定手段を並べると1文が長くなる
const JUDGE_CHECKERS = textlint(
  "jtf-style/1.2.1.句点(。)と読点(、)",
  "jtf-style/4.1.1.句点(。)",
  "jtf-style/4.3.1.丸かっこ（）",
  "sentence-length"
);

// 日本語を含まない行で誤検出になる判定手段。文の長さと読点の数は日本語の文のための基準である。
// 全角英数字や半角カナのような文字の種類の指摘は、英語の行でも外さない
const NON_JAPANESE_CHECKERS = textlint("sentence-length", "max-comma");

// 「」の中に違反の例を示してよいファイル。ルールとその判定方法を説明する文書だけに限る。
// README.md や CONTRIBUTING.md の本文で「」を使って引用した文は、ほかの文と同じく採点する
const EXAMPLE_FILE_PREFIXES = ["skills/docs-rules/rules/", "skills/docs-rules/references/", "skills/docs-rules/evaluators/"];

const JAPANESE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

// 除外条件。match は (指摘, 行の文字列, { file, lines }) を受け取る
export const EXCLUSIONS = [
  {
    // examples.md の失敗例の段落。違反を含めて書いてある
    reason: "examples.mdの失敗例",
    match: (v, line, ctx) => line.startsWith(">") && inFailureExample(ctx, v.line),
  },
  {
    reason: "出典欄の資料名と箇所",
    match: (v, line) => line.startsWith("- 出典：") && SOURCE_CHECKERS.has(v.checker),
  },
  {
    reason: "判定欄のルール名",
    match: (v, line) => line.startsWith("- 判定：") && JUDGE_CHECKERS.has(v.checker),
  },
  {
    // README.md の英語の概要など
    reason: "日本語を含まない行",
    match: (v, line) => !JAPANESE.test(line) && NON_JAPANESE_CHECKERS.has(v.checker),
  },
  {
    // ルールの説明の中で「」に例示した語や記号（「.」「,」、NOT-011の「-er」、失敗例の文）
    reason: "「」の中の例示",
    match: (v, line, ctx) => EXAMPLE_FILE_PREFIXES.some((p) => ctx.file.startsWith(p)) && insideQuotes(v, line, "「", "」"),
  },
  {
    // 『』の中の書籍や資料の題名（NOT-018）。題名は原文のまま写すため、「及び」や語の間のスペースも残る
    reason: "『』の中の題名",
    match: (v, line) => insideQuotes(v, line, "『", "』"),
  },
];

/** 指摘に当たる最初の除外条件を返す。当たらなければ undefined を返す。 */
export function findExclusion(v, line, ctx) {
  return EXCLUSIONS.find((e) => e.match(v, line, ctx));
}
