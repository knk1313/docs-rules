"use strict";
// NOT-006 常用漢字表にない漢字と音訓を使わない。
// 判定するのは、常用漢字表の字種にない漢字（表外漢字）だけである。
// 表にない音訓の判定は、語の読みを決める形態素解析が要るため実装していない（evaluators/README.md）。
// 固有名詞はルールの対象外だが、文から見分けられないため指摘に含まれる。
// 定着した専門用語（「脆弱性」など）は、evaluators/allowed-terms.json の NOT-006 に語の単位で書くと指摘しない。
// （--rulesdir で読み込むルールには .textlintrc.json の設定値が渡らないため、ファイルから直接読む）
const path = require("path");
const joyo = require(path.join(__dirname, "..", "data", "joyo-kanji.json"));
const ALLOW = require(path.join(__dirname, "..", "allowed-terms.json"))["NOT-006"] || [];

// 常用漢字表の字種。許容字体（「遡」「叱」など、括弧内に示された字体）も表内として扱う
const JOYO = new Set();
for (const entry of joyo.entries) {
  JOYO.add(entry.kanji);
  if (entry.accepted_form) JOYO.add(entry.accepted_form);
}

// 漢字の並び。踊り字や「〆」「〇」は字種ではないため、漢字の判定から外す
const HAN = /\p{Script=Han}/u;
const NOT_KANJI = new Set(["々", "〆", "〇", "〻"]);

function isOutsideTable(ch) {
  return HAN.test(ch) && !NOT_KANJI.has(ch) && !JOYO.has(ch);
}

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      // allowed-terms.json に書いた語の範囲（文字の添字）を先に集め、その中の漢字は見ない
      const allowed = new Set();
      for (const word of ALLOW) {
        for (let at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + 1)) {
          for (let k = at; k < at + word.length; k += 1) allowed.add(k);
        }
      }
      const chars = Array.from(text);
      let offset = 0;
      for (let i = 0; i < chars.length; ) {
        if (!isOutsideTable(chars[i]) || allowed.has(offset)) {
          offset += chars[i].length;
          i += 1;
          continue;
        }
        // 表外漢字が続くときは、まとめて1つの指摘にする
        const start = offset;
        let run = "";
        while (i < chars.length && isOutsideTable(chars[i]) && !allowed.has(offset)) {
          run += chars[i];
          offset += chars[i].length;
          i += 1;
        }
        report(node, new RuleError(`「${run}」は常用漢字表にない`, { padding: context.locator.range([start, start + run.length]) }));
      }
    },
  };
};
