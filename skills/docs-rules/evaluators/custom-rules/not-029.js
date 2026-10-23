"use strict";
// NOT-029 本文の日付は「2026年10月23日」の形で書き、年は西暦の4桁で書く。
// 年から書いた「2026/10/23」の形を指摘し、「2026年10月23日」に直す候補を返す。
// 年のない「10/23」は分数と見分けられないため、AI評価で扱う。

const PATTERN = /(?<![0-9/])([0-9]{4})\/([0-9]{1,2})\/([0-9]{1,2})(?![0-9/])/g;

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
        const to = `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
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
