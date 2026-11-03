"use strict";
// NOT-004 繰り返し符号は「々」だけを使う。
// 「ゝ」「ゞ」「ヽ」「ヾ」「〃」を指摘する。直した形を作れるときは、直し方の候補を返す。
// - 漢字の後ろの符号は「々」に直す（「人ゝ」「各〃」→「人々」「各々」）
// - 仮名の後ろの「ゝ」「ヽ」は前の字を繰り返す（「こゝろ」→「こころ」）
// - 仮名の後ろの「ゞ」「ヾ」は、前の字に濁点を付けて繰り返す（「たゞ」→「ただ」）

const MARKS = /[ゝゞヽヾ〃]/g;
const KANJI = /[一-龯]/;
const HIRAGANA = /[ぁ-ゖ]/;
const KATAKANA = /[ァ-ヺ]/;
// 濁点を付けられる仮名。Unicodeでは、濁点の付いた字が次の符号位置にある
const VOICEABLE = /[かきくけこさしすせそたちつてとはひふへほカキクケコサシスセソタチツテトハヒフヘホ]/;

/** 符号を直した形を返す。作れないときは null を返す。 */
function replacement(prev, mark) {
  if (!prev) return null;
  if (KANJI.test(prev)) return "々";
  const kana = (mark === "ゝ" || mark === "ゞ") ? HIRAGANA : (mark === "ヽ" || mark === "ヾ") ? KATAKANA : null;
  if (!kana || !kana.test(prev)) return null;
  if (mark === "ゝ" || mark === "ヽ") return prev;
  return VOICEABLE.test(prev) ? String.fromCharCode(prev.charCodeAt(0) + 1) : null;
}

function reporter(context) {
  const { Syntax, RuleError, report, getSource, fixer, locator } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const m of text.matchAll(MARKS)) {
        const to = replacement(text[m.index - 1], m[0]);
        const range = [m.index, m.index + 1];
        report(
          node,
          new RuleError(
            to ? `繰り返し符号「${m[0]}」は使わない。「${to}」にする` : `繰り返し符号「${m[0]}」は使わない`,
            to ? { padding: locator.range(range), fix: fixer.replaceTextRange(range, to) } : { padding: locator.range(range) }
          )
        );
      }
    },
  };
}

// 直し方を返すルールは、textlintの決まりで linter と fixer の両方を持つ形にする
module.exports = { linter: reporter, fixer: reporter };
