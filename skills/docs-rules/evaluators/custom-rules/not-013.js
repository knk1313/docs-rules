"use strict";
// NOT-013 「兆」「億」「万」の単位は漢字で書く。
// 判定するのは次の2つ。
// - 1万以上の数を、「万」「億」「兆」を交ぜずに算用数字だけで書いたもの（「120000000円」「1,200,000円」）
// - 「千」「百」を単位として算用数字の後ろに付けたもの（「3千人」「5百円」）
const { NUMBER_PATTERN, isExcludedNumber } = require("../lib/numbers");

const UNITS = [
  [1000000000000n, "兆"],
  [100000000n, "億"],
  [10000n, "万"],
];

/** 1万以上の数を「1億2,000万」の形にする。 */
function toKanjiUnits(value) {
  let rest = value;
  let out = "";
  for (const [size, name] of UNITS) {
    if (rest >= size) {
      out += `${withSeparators(rest / size)}${name}`;
      rest %= size;
    }
  }
  if (rest > 0n) out += withSeparators(rest);
  return out;
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
        if (isExcludedNumber(text, start, end)) continue;
        const after = text.slice(end);
        // 「3千人」「5百円」のように、千・百を単位として付けたもの
        if (/^[千百]/.test(after) && !/^[千百][万億兆]/.test(after)) {
          const unit = after[0] === "千" ? 1000n : 100n;
          const value = BigInt(raw.replace(/,/g, "")) * unit;
          const fixed = value >= 10000n ? toKanjiUnits(value) : withSeparators(value);
          report(
            node,
            new RuleError(`「${raw}${after[0]}」→「${fixed}」`, {
              index: start,
              fix: fixer.replaceTextRange([start, end + 1], fixed),
            })
          );
          continue;
        }
        // すでに「万」「億」「兆」が後ろに続くもの（「1億2,000万円」の「1」）は直さない
        if (/^[万億兆]/.test(after)) continue;
        const digits = raw.replace(/,/g, "");
        if (digits.length < 5) continue;
        const fixed = toKanjiUnits(BigInt(digits));
        report(
          node,
          new RuleError(`「${raw}」→「${fixed}」`, {
            index: start,
            fix: fixer.replaceTextRange([start, end], fixed),
          })
        );
      }
    },
  };
}

// 直し方を返すルールは、textlintの決まりで linter と fixer の両方を持つ形にする
module.exports = { linter: rule, fixer: rule };
