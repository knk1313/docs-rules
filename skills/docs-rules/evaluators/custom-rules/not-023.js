"use strict";
// NOT-023 全角文字どうしの間にスペースを入れない。
// ja-no-space-between-full-width と jtf-style/3.1.2 が拾わない、次の2つを判定する。
// - 全角スペース（U+3000）
// - 読点・句点の直後の半角スペースで、後ろに全角文字が続くもの（「終わったら、 結果を」）

const FULL_WIDTH_SPACE = /　+/g;
const AFTER_PUNCTUATION = /(?<=[、。])[ ]+(?=[^\x00-\x7F])/g;

module.exports = {
  linter: reporter,
  fixer: reporter,
};

function reporter(context) {
  const { Syntax, RuleError, report, getSource, fixer, locator } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const [pattern, message] of [
        [FULL_WIDTH_SPACE, "全角スペースを入れない"],
        [AFTER_PUNCTUATION, "読点や句点の後ろにスペースを入れない"],
      ]) {
        for (const m of text.matchAll(pattern)) {
          report(
            node,
            new RuleError(message, {
              padding: locator.range([m.index, m.index + m[0].length]),
              fix: fixer.removeRange([m.index, m.index + m[0].length]),
            })
          );
        }
      }
    },
  };
}
