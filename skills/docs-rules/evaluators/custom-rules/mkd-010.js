"use strict";
// MKD-010 リンクの文言は、リンク先が分かる語にする。
// markdownlint の MD059 が判定しない日本語の語（「こちら」「ここ」「リンク」など）を、リンクの文言に限って判定する。
// prh の辞書は本文のすべての語に当たるため、リンクの文言だけを見るこのルールで判定する。

const VAGUE_TEXTS = new Set(["こちら", "ここ", "リンク", "このリンク", "こちらのリンク", "このページ", "こちらのページ"]);

/** リンクの子ノードから、表示される文言を取り出す。 */
function linkText(node) {
  if (typeof node.value === "string") return node.value;
  return (node.children || []).map(linkText).join("");
}

module.exports = function (context) {
  const { Syntax, RuleError, report } = context;
  return {
    [Syntax.Link](node) {
      const text = linkText(node).trim();
      if (VAGUE_TEXTS.has(text)) {
        report(node, new RuleError(`リンクの文言「${text}」はリンク先を示さない`));
      }
    },
  };
};
