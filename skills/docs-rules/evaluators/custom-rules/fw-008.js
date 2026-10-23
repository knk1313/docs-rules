"use strict";
// FW-008 文語の名残を使わない。
// 「〜せんとする」「〜べく」「〜べし」と、名詞を修飾しない「べき」（「すべきだ」「すべきである」）を判定する。
// 口語への言い換えは文によって変わるため、直し方の候補は返さない。

const PATTERNS = [
  // 「〜せんとする」「〜せんとした」
  /せんと(?=[すし])/g,
  // 「〜べく」。副詞の「なるべく」は除く
  /(?<!なる)べく/g,
  // 「〜べし」
  /べし/g,
  // 文末や読点の前で終わる「べき」（「すべきだ」「すべきである」「すべき。」）。名詞の前の「べき」は除く
  /べき(?=だ|で[あす]|。|、|$)/g,
];

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource, locator } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const pattern of PATTERNS) {
        for (const m of text.matchAll(pattern)) {
          report(node, new RuleError(`「${m[0]}」は文語の言い方`, { padding: locator.range([m.index, m.index + m[0].length]) }));
        }
      }
    },
  };
};
