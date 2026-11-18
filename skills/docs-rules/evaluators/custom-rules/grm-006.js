"use strict";
// GRM-006 二重否定を使わない。
// no-double-negative-ja が拾わない「〜ないとは言えない」「〜ないとも限らない」を判定する（#67）。
// 肯定の形への言い換えは文によって変わるため、直し方の候補は返さない。

const PATTERN = /ない(?:とは(?:言え|いえ)|とも限ら)ない/g;

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource, locator } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const m of text.matchAll(PATTERN)) {
        report(node, new RuleError(`「${m[0]}」は二重否定`, { padding: locator.range([m.index, m.index + m[0].length]) }));
      }
    },
  };
};
