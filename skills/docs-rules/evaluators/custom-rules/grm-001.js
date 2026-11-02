"use strict";
// GRM-001 常体と敬体を混ぜない。
// 本文（見出し、箇条書、表、引用の外）の文末を常体と敬体に分けて数え、少ない方の文末を指摘する。同じ数なら、最初の文末と違う方を指摘する。
// textlint の no-mix-dearu-desumasu は「だ。」と「ください。」を数えず、「である」と「ください」、「だ」と「ます」の混在を拾わないため、この判定に置き換えた（#67）。
// 常体として数えるのは「だ」「である」とその過去形で終わる文だけで、「した」で終わる文は数えない。「した」と「しました」の混在はAI評価で扱う。
// 箇条書の文末は GRM-016、見出しの文末は GRM-015 で扱う。

const ENDINGS = /(ください|でしょう|ましょう|ました|ません|でした|です|ます|であった|である|だった|だ)(?=。)/g;
const POLITE = new Set(["ください", "でしょう", "ましょう", "ました", "ません", "でした", "です", "ます"]);
const OUTSIDE_BODY = ["List", "Table", "Header", "BlockQuote"];

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource, locator } = context;
  let depth = 0;
  const endings = [];
  const handlers = {
    [Syntax.Str](node) {
      if (depth > 0) return;
      const text = getSource(node);
      for (const m of text.matchAll(ENDINGS)) {
        endings.push({ node, index: m.index, value: m[1], polite: POLITE.has(m[1]) });
      }
    },
    [`${Syntax.Document}:exit`]() {
      const polite = endings.filter((e) => e.polite).length;
      const plain = endings.length - polite;
      if (polite === 0 || plain === 0) return;
      // 少ない方を指摘する。同じ数なら、最初の文末と違う方を指摘する
      const reportPolite = polite < plain || (polite === plain && !endings[0].polite);
      for (const e of endings.filter((x) => x.polite === reportPolite)) {
        const kind = reportPolite ? "敬体" : "常体";
        report(
          e.node,
          new RuleError(`常体と敬体が混ざっている。「${e.value}」は${kind}の文末`, { padding: locator.range([e.index, e.index + e.value.length]) })
        );
      }
    },
  };
  for (const type of OUTSIDE_BODY) {
    handlers[Syntax[type]] = () => {
      depth += 1;
    };
    handlers[`${Syntax[type]}:exit`] = () => {
      depth -= 1;
    };
  }
  return handlers;
};
