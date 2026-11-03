"use strict";
// NOT-021 小数点は「.」、桁区切りは「,」を半角で使う。
// 「1,5秒」「12,25ミリ秒」のように、「,」の後ろが3桁でない数を、小数点に「,」を使ったものとして指摘する。
// 「0,5」の形は jtf-style/2.1.10 が拾うため、ここでは見ない。

const PATTERN = /(?<![0-9,.A-Za-z])([1-9][0-9]*),([0-9]+)(?![0-9,.A-Za-z])/g;

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
        // 3桁なら桁区切りとして正しい
        if (m[2].length === 3) continue;
        const to = `${m[1]}.${m[2]}`;
        report(
          node,
          new RuleError(`「${m[0]}」は小数点に「.」を使い「${to}」にする`, {
            padding: locator.range([m.index, m.index + m[0].length]),
            fix: fixer.replaceTextRange([m.index, m.index + m[0].length], to),
          })
        );
      }
    },
  };
}
