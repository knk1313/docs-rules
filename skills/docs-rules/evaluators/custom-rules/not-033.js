"use strict";
// NOT-033 表、ファイル名、データの日付と時刻は「2026-10-23」「14:30」の形で書く。
// 月か日を0で埋めていない「2026-4-1」の形を指摘し、「2026-04-01」に直す候補を返す。
// どの箇所でこの形を使うべきかは文脈で決まるため、AI評価で扱う。
// 英字に続く形（「v2026-1-1」のような版の番号）は日付として扱わない。

const PATTERN = /(?<![0-9A-Za-z])([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?![0-9])/g;

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
        if (m[2].length === 2 && m[3].length === 2) continue;
        const to = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
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
