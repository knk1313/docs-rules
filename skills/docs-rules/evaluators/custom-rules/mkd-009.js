"use strict";
// MKD-009 強調は「**」で書き、強調を見出しの代わりにしない。
// 語の途中に書いた「__語__」は、CommonMarkでは強調にならないため、markdownlint の MD050 が見ない（「前に__かならず__内容を」）。
// 書き手は強調のつもりで「__」を使っているため、本文の文字列に残った「__語__」を拾う。
// 本文に書いた識別子（「__init__」）も当たるが、識別子はコードの記法（`）で囲むため、囲んでいないものを指摘する。

const PATTERN = /(?<!_)__([^_\s][^_]*?[^_\s]|[^_\s])__(?!_)/g;

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource, locator } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const m of text.matchAll(PATTERN)) {
        report(
          node,
          new RuleError(`「${m[0]}」は強調にならない。強調は「**${m[1]}**」と書く`, {
            padding: locator.range([m.index, m.index + m[0].length]),
          })
        );
      }
    },
  };
};
