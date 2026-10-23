"use strict";
// NOT-002 句点には「。」、読点には「、」を使う。
// 全角の「．」「，」をすべて指摘し、「。」「、」に直す候補を返す。
// 数字に挟まれたもの（「1．5」「1，000」）は小数点と桁区切りのため、半角の「.」「,」に直す候補を返す。
// jtf-style/1.2.2 は1つのテキストで最初の1つしか指摘せず、すべて半角に直す候補を返すため、このルールで置き換えた。

const TARGET = /[．，]/g;
const DIGIT = /[0-9０-９]/;
const REPLACE = { "．": "。", "，": "、" };
const REPLACE_IN_NUMBER = { "．": ".", "，": "," };

module.exports = {
  linter: reporter,
  fixer: reporter,
};

function reporter(context) {
  const { Syntax, RuleError, report, getSource, fixer, locator } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const m of text.matchAll(TARGET)) {
        const i = m.index;
        const inNumber = DIGIT.test(text[i - 1] ?? "") && DIGIT.test(text[i + 1] ?? "");
        const to = (inNumber ? REPLACE_IN_NUMBER : REPLACE)[m[0]];
        report(
          node,
          new RuleError(`「${m[0]}」は「${to}」にする`, {
            padding: locator.range([i, i + 1]),
            fix: fixer.replaceTextRange([i, i + 1], to),
          })
        );
      }
    },
  };
}
