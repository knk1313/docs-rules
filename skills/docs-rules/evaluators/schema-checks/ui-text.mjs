// UI文言（ui-text）の文言表を採点する（#33）。score.mjs が --type ui-text のときだけ読み込む。
//
// schemas/ui-text.md の「文書全体の制約」のうち、判定に docs-rules/ui-text と書いたルールを判定する。
// 「## 文言」と「## エラーと空の状態」の表の「要素」「文言」「上限」の列だけを見る。地の文は見ない。

const CHECKER = "docs-rules/ui-text";

// 文言表を置くセクション
const TABLE_SECTIONS = ["## 文言", "## エラーと空の状態"];

// 機能の説明の言い回し（UI-010）。どの要素でも使わない
const FEATURE_PHRASES = ["機能です", "機能があります", "提供します", "提供しています", "本画面", "この画面では", "本機能", "本サービス"];

// エラーの汎用の文言（UI-011）と、感嘆の語と謝罪の言葉（UI-012）。「エラー」の行だけで見る
const ERROR_PHRASES = [
  { id: "UI-011", phrases: ["エラーが発生しました", "問題が発生しました", "正しくありません", "無効です", "不正です"] },
  { id: "UI-012", phrases: ["おっと", "あれっ", "申し訳ありません", "申し訳ございません", "すみません", "ごめんなさい"] },
];

// 文の数を1〜2文に限る要素
const SENTENCE_LIMITS = { エラー: "UI-001", 空の状態の本文: "UI-002" };

/** 表の1行を列に分ける。「\|」は区切りにしない。 */
function cells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));
}

/**
 * 文言表の行を読む。見出しの行に「要素」と「文言」の列がある表だけを対象にする。
 * 返す行は { number, line, element, text, limit }。limit は「上限」の列がない表では null。
 */
export function tableRows(lines) {
  const rows = [];
  let section = null;
  let columns = null;
  for (let i = 0; i < lines.length; i += 1) {
    const { line, number } = lines[i];
    if (/^## /.test(line)) section = line.trim();
    if (!TABLE_SECTIONS.includes(section) || !line.trim().startsWith("|")) {
      columns = null;
      continue;
    }
    const row = cells(line);
    if (!columns) {
      const next = lines[i + 1]?.line ?? "";
      if (!/^\s*\|?\s*:?-{3,}/.test(next)) continue;
      columns = { element: row.indexOf("要素"), text: row.indexOf("文言"), limit: row.indexOf("上限") };
      if (columns.element < 0 || columns.text < 0) columns = { skip: true };
      i += 1;
      continue;
    }
    if (columns.skip) continue;
    rows.push({
      number,
      line,
      element: row[columns.element] ?? "",
      text: row[columns.text] ?? "",
      limit: columns.limit < 0 ? null : (row[columns.limit] ?? ""),
    });
  }
  return rows;
}

/** 文の数を数える。「。」「？」「！」で区切る。 */
function sentenceCount(text) {
  return text.split(/(?<=[。？！])/).filter((s) => s.trim()).length;
}

function violation(row, ruleId, excerpt, fix) {
  const at = row.line.indexOf(excerpt);
  return { rule_id: ruleId, line: row.number, column: at < 0 ? 1 : at + 1, excerpt, fix, judge: "機械", checker: CHECKER };
}

/** 文言表を採点し、違反を返す。lines は score.mjs の linesOutsideCode の結果。 */
export function check(lines) {
  const violations = [];
  for (const row of tableRows(lines)) {
    const { element, text } = row;
    if (element === "プレースホルダー") {
      violations.push(violation(row, "UI-005", element, "プレースホルダーを消し、入力の条件と例をサポートテキストに書く"));
    }
    if (row.limit !== null) {
      const length = [...text].length;
      if (!/^\d+$/.test(row.limit)) {
        violations.push(violation(row, "UI-009", text, "「上限」の列に、文字数の上限を数字で書く"));
      } else if (length > Number(row.limit)) {
        violations.push(violation(row, "UI-009", text, `文言を${row.limit}字以内にする（今は${length}字）`));
      }
    }
    const limitRule = SENTENCE_LIMITS[element];
    if (limitRule && sentenceCount(text) > 2) {
      violations.push(violation(row, limitRule, text, "文言を1〜2文にする"));
    }
    for (const phrase of FEATURE_PHRASES) {
      if (text.includes(phrase)) {
        violations.push(violation(row, "UI-010", phrase, `「${phrase}」を使わず、利用者がその画面でできることを書く`));
      }
    }
    if (element !== "エラー") continue;
    for (const { id, phrases } of ERROR_PHRASES) {
      for (const phrase of phrases) {
        if (!text.includes(phrase)) continue;
        const fix = id === "UI-011" ? `「${phrase}」を使わず、何が違うかと直し方を書く` : `「${phrase}」を消し、何が起きたかとすることだけを書く`;
        violations.push(violation(row, id, phrase, fix));
      }
    }
  }
  return violations;
}

/**
 * 共通ルールの違反のうち、schemas/ui-text.md の「共通ルールの例外」に当たるものなら true を返す。
 * NOT-003：ラベルに限り、問いの形の文言に「？」を付けてよい。
 */
export function exempt(v, lines) {
  if (v.rule_id !== "NOT-003") return false;
  const row = tableRows(lines).find((r) => r.number === v.line);
  return Boolean(row && row.element === "ラベル" && row.text.endsWith("？"));
}
