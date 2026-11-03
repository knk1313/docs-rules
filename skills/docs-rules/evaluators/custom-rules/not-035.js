"use strict";
// NOT-035 漢字を7字以上続けない。
// textlint-rule-max-kanji-continuous-len と同じく漢字の連続を数え、固有名詞とみなせるものを除く（#72）。
// - evaluators/allowed-terms.json の NOT-035 に書いた語
// - かぎ括弧（「」『』）の中にある連続。文書や会議の題名を引くときの書き方のため
// - 「第32次」に続く連続（「第32次地方制度調査会」）
// - 組織、会議、法令、事業、文書の名前に付く語で終わる連続（「日本経済団体連合会」「デジタル社会形成基本法」）。末尾の「等」は除いて見る
// これ以外の固有名詞は機械では見分けられないため、AI評価で扱う。
// リンク、画像、引用、強調の中は、もとのルールと同じく見ない。
// （--rulesdir で読み込むルールは、採点のパッケージの node_modules から require できないため、親のノードは自分でたどる）
const path = require("path");

const ALLOW = require(path.join(__dirname, "..", "allowed-terms.json"))["NOT-035"] || [];
const MAX = 6;
const KANJI_RUN = /(?:[々〇〻㐀-鿿豈-﫿]|[\uD840-\uD87F][\uDC00-\uDFFF])+/g;

// 名前に付く語。「方法」「社会」のように一般の語の末尾にもなるものは入れない
const NAME_SUFFIX = /(?:協議会|検討会|審議会|調査会|委員会|連合会|研究会|協会|学会|会議|会合|事業|仕様書|試験|版|(?<![方手用文技寸作])法)$/;

/** 位置がかぎ括弧の中にあるかを見る。同じ文字列の中で、前に開き、後ろに閉じがあるときを中とする。 */
function inQuote(text, start, end) {
  for (const [open, close] of [["「", "」"], ["『", "』"]]) {
    const before = text.slice(0, start);
    if (before.lastIndexOf(open) > before.lastIndexOf(close) && text.indexOf(close, end) !== -1) return true;
  }
  return false;
}

/** 固有名詞とみなして指摘しない連続かを見る。 */
function isName(text, run, start) {
  if (ALLOW.includes(run)) return true;
  if (inQuote(text, start, start + run.length)) return true;
  // 「第32次地方制度調査会」は、漢字の連続が「次」から始まる
  if (/^次/.test(run) && /第[0-9０-９]+$/.test(text.slice(0, start))) return true;
  return NAME_SUFFIX.test(run.replace(/等$/, ""));
}

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource } = context;
  const skipped = new Set([Syntax.Link, Syntax.Image, Syntax.BlockQuote, Syntax.Emphasis]);
  const inSkipped = (node) => {
    for (let p = node.parent; p; p = p.parent) if (skipped.has(p.type)) return true;
    return false;
  };
  return {
    [Syntax.Str](node) {
      if (inSkipped(node)) return;
      const text = getSource(node);
      for (const m of text.matchAll(KANJI_RUN)) {
        if (m[0].length <= MAX) continue;
        if (isName(text, m[0], m.index)) continue;
        report(node, new RuleError(`漢字が${MAX + 1}字以上続いている: ${m[0]}`, { index: m.index }));
      }
    },
  };
};
