// テストで使う、Markdownの見出しと表を読む補助関数。
// 各READMEの書式例はコードブロックの中にあるため、コードブロックの中は読まない。

import { readFileSync } from "node:fs";

/** ファイルを読み、コードブロックの外の行を { text, number } の配列で返す。number は1始まりの行番号。 */
export function linesOutsideCode(path) {
  const out = [];
  let fence = null;
  readFileSync(path, "utf8")
    .split(/\r?\n/)
    .forEach((text, i) => {
      const m = text.match(/^\s*(`{3,}|~{3,})/);
      if (m) {
        if (!fence) fence = m[1][0];
        else if (m[1][0] === fence) fence = null;
        return;
      }
      if (!fence) out.push({ text, number: i + 1 });
    });
  return out;
}

/** 指定した階層の見出しの文字列を、出てくる順に返す。level=2 なら「## 」で始まる行。 */
export function headings(path, level) {
  const prefix = `${"#".repeat(level)} `;
  return linesOutsideCode(path)
    .filter(({ text }) => text.startsWith(prefix))
    .map(({ text }) => text.slice(prefix.length).trim());
}

/** 指定した「##」見出しの節の行を返す。次の同じ階層か上の階層の見出しの手前までを節とする。 */
export function section(path, title, level = 2) {
  const lines = linesOutsideCode(path);
  const start = lines.findIndex(({ text }) => text === `${"#".repeat(level)} ${title}`);
  if (start < 0) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    const m = line.text.match(/^(#+) /);
    if (m && m[1].length <= level) break;
    out.push(line);
  }
  return out;
}

/** 行の配列から、表の本文の行をセルの配列にして返す。見出し行と区切り行は除く。 */
export function tableRows(lines) {
  const rows = [];
  let inTable = false;
  for (const { text, number } of lines) {
    if (!text.startsWith("|")) {
      inTable = false;
      continue;
    }
    const cells = text
      .slice(1, text.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((c) => c.trim());
    if (!inTable) {
      // 表の1行目は見出し行
      inTable = true;
      continue;
    }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    rows.push({ cells, number });
  }
  return rows;
}

/** 括弧の外にある「、」で区切る。ルール名に含まれる括弧（「句点(。)と読点(、)」）の中では区切らない。 */
export function splitOutsideParens(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(" || ch === "（") depth += 1;
    if (ch === ")" || ch === "）") depth -= 1;
    if (ch === "、" && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Markdownのリンク [文言](パス) からパスを取り出す。 */
export function linkTarget(cell) {
  const m = cell.match(/\]\(([^)]+)\)/);
  return m ? m[1] : null;
}
