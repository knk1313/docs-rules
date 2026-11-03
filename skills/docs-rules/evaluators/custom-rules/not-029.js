"use strict";
// NOT-029 本文の日付は「2026年10月23日」の形で書き、年は西暦の4桁で書く。
// 次の形を指摘し、「2026年10月23日」に直す候補を返す。
// - 年から書いた「2026/10/23」「2026.10.23」の形
// - 月か日を0で埋めた「2026年05月07日」の形
// 年のない「10/23」は分数と見分けられないため、AI評価で扱う。

const PATTERN = /(?<![0-9/.A-Za-z])([0-9]{4})([/.])([0-9]{1,2})\2([0-9]{1,2})(?![0-9/.])|([0-9]{4})年([0-9]{1,2})月(?:([0-9]{1,2})日)?/g;

module.exports = {
  linter: reporter,
  fixer: reporter,
};

function reporter(context) {
  const { Syntax, RuleError, report, getSource, fixer, locator } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const m of text.matchAll(PATTERN)) {
        let to;
        if (m[1]) {
          to = `${m[1]}年${Number(m[3])}月${Number(m[4])}日`;
        } else {
          // 「年」「月」「日」を付けた形は、0で埋めたときだけ指摘する
          if (!m[6].startsWith("0") && !(m[7] || "").startsWith("0")) continue;
          to = `${m[5]}年${Number(m[6])}月` + (m[7] ? `${Number(m[7])}日` : "");
        }
        report(
          node,
          new RuleError(`「${m[0]}」は「${to}」の形にする`, {
            padding: locator.range([m.index, m.index + m[0].length]),
            fix: fixer.replaceTextRange([m.index, m.index + m[0].length], to),
          })
        );
      }
    },
  };
}
