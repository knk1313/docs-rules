"use strict";
// GRM-016 箇条書は本文の文体に合わせ、一つの箇条書の中で文末をそろえる。
// 一つの箇条書の中で、敬体で終わる項目と、敬体でない項目（常体、体言止め）が混ざっていたら、少ない方を指摘する。同じ数なら敬体の項目を指摘する。
// jtf-style/1.1.3 は文末の句点の有無だけを見て、敬体の混在を拾わないため、この判定を足した（#67）。
// 入れ子の箇条書は、別の箇条書として扱う。常体と体言止めの混在は、品詞を見ないと分からないため、AI評価で扱う。

const POLITE = /(ください|でしょう|ましょう|ました|ません|でした|です|ます)。?$/;

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource } = context;
  return {
    [Syntax.List](node) {
      const items = [];
      for (const item of node.children) {
        const paragraph = item.children.find((c) => c.type === Syntax.Paragraph);
        if (!paragraph) continue;
        const lines = getSource(paragraph).trim().split("\n");
        items.push({ paragraph, polite: POLITE.test(lines[lines.length - 1].trim()) });
      }
      const polite = items.filter((i) => i.polite).length;
      const other = items.length - polite;
      if (polite === 0 || other === 0) return;
      const reportPolite = polite <= other;
      for (const i of items.filter((x) => x.polite === reportPolite)) {
        const message = reportPolite ? "箇条書の中で、この項目だけが敬体で終わっている" : "箇条書の中で、この項目だけが敬体で終わっていない";
        report(i.paragraph, new RuleError(message));
      }
    },
  };
};
