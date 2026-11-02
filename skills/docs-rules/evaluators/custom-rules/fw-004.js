"use strict";
// FW-004 弱い言い切りを使わない。
// ja-no-weak-phrase が拾わない「〜と思われる」「〜と考えられる」「〜だろう」「〜でしょう」で結ぶ文を判定する（#67）。
// 「〜と考えられる理由」のように名詞を修飾する形は、結びではないため除く。
// 「よろしいでしょうか」のような問いかけは、弱い言い切りではないため除く。
// 言い切るか「未確認」と書くかは根拠の有無で変わるため、直し方の候補は返さない。

const PATTERNS = [
  /と(?:思われ|考えられ)(?:る|ます)(?=。|、|$)/g,
  /(?:だろう|でしょう)(?=。|、|$)/g,
];

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource, locator } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const pattern of PATTERNS) {
        for (const m of text.matchAll(pattern)) {
          report(node, new RuleError(`「${m[0]}」は弱い言い切り`, { padding: locator.range([m.index, m.index + m[0].length]) }));
        }
      }
    },
  };
};
