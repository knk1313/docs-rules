"use strict";
// NOT-012 横書きでは算用数字を使い、4桁以上は3桁ごとにコンマで区切る。
// 判定するのは次の2つ。
// - 4桁の算用数字で、3桁ごとの「,」がないもの（「1200人」）。1万以上の数は NOT-013 が「万」「億」「兆」を交ぜた形に直すため、ここでは見ない
// - 「千」「百」を含む漢数字で数量を書いたもの（「千二百人」）。助数詞が後ろに続くものだけを見る
const { NUMBER_PATTERN, isExcludedNumber } = require("../lib/numbers");

// 漢数字の数量。「千」か「百」を含む2字以上の漢数字の後ろに助数詞が続くものを取る。
// 「数百人」「何千人」のような概数は NOT-014 で漢数字のままとするため除く
const KANJI_NUMBER = /(?<![数何])[一二三四五六七八九十百千]{2,}(?=[人円件個回本台枚冊名社点日週年秒分時])/g;
const KANJI_DIGITS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

/** 「千二百」のような漢数字を数に直す。直せないときは null を返す。 */
function kanjiToNumber(text) {
  let total = 0;
  let digit = 0;
  for (const ch of text) {
    if (ch in KANJI_DIGITS) {
      digit = KANJI_DIGITS[ch];
    } else if (ch === "十" || ch === "百" || ch === "千") {
      const unit = { 十: 10, 百: 100, 千: 1000 }[ch];
      total += (digit || 1) * unit;
      digit = 0;
    } else {
      return null;
    }
  }
  return total + digit;
}

/** 3桁ごとに「,」で区切った形にする。 */
function withSeparators(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function rule(context) {
  const { Syntax, RuleError, report, getSource, fixer } = context;
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      for (const m of text.matchAll(NUMBER_PATTERN)) {
        const raw = m[0].replace(/,+$/, "");
        const start = m.index;
        const end = start + raw.length;
        if (raw.includes(",")) continue;
        if (raw.length !== 4) continue;
        if (isExcludedNumber(text, start, end)) continue;
        const fixed = withSeparators(raw);
        report(
          node,
          new RuleError(`「${raw}」→「${fixed}」`, {
            index: start,
            fix: fixer.replaceTextRange([start, end], fixed),
          })
        );
      }
      if (!/[千百]/.test(text)) return;
      for (const m of text.matchAll(KANJI_NUMBER)) {
        if (!/[千百]/.test(m[0])) continue;
        const value = kanjiToNumber(m[0]);
        if (value === null) continue;
        const fixed = value >= 1000 ? withSeparators(value) : String(value);
        report(
          node,
          new RuleError(`「${m[0]}」→「${fixed}」`, {
            index: m.index,
            fix: fixer.replaceTextRange([m.index, m.index + m[0].length], fixed),
          })
        );
      }
    },
  };
}

// 直し方を返すルールは、textlintの決まりで linter と fixer の両方を持つ形にする
module.exports = { linter: rule, fixer: rule };
