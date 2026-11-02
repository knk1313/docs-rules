"use strict";
// NOT-010 送り仮名は『送り仮名の付け方』の本則か許容に従い、一つの文書の中で同じ語の書き方をそろえる。
// 告示の本則の形と許容の形の組（「売り上げ」「売上げ」「売上」）ごとに、文書の中で使われた形を数える。
// 二つ以上の形が混ざっていたら、最も多い形と違うものを指摘する。同じ数なら本則の形にそろえる。
// 本則の形と許容の形は、どちらも単独では指摘しない（#67）。
// 形の拾い方は、もとの prh 辞書（data/tools/build_prh.py）と同じにする。
// - 1字の許容の形（「答」「問」）は熟語の一部に当たるため使わない
// - 後ろに漢字が続く形（「申込書」）は、通則7の慣用の語として数えない
// - 許容の形が、判定データにある正しい語の一部に当たる場合は使わない
// （--rulesdir で読み込むルールには textlintrc.json の設定値が渡らないため、ファイルから直接読む）
const path = require("path");
const data = require(path.join(__dirname, "..", "data", "okurigana.json"));

const KANJI = "一-龯々〆";

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 判定データから、正しい形の語をすべて集める。許容の形が、ほかの正しい語の一部に当たらないかを見るのに使う。 */
function correctWords() {
  const words = new Set();
  const addExamples = (examples) => {
    for (const ex of examples || []) {
      if (ex.base) words.add(ex.base);
      if (ex.slot) {
        // ｟｠の付いた語は、｟｠の部分と合わせた形だけを正しい語として扱う（「売上高」「博多織」）
        words.add(ex.word + ex.slot);
        words.add(ex.slot + ex.word);
      } else {
        words.add(ex.word);
      }
    }
  };
  for (const rule of data.rules) {
    const principle = rule.principle || {};
    addExamples(principle.examples);
    for (const group of principle.groups || []) addExamples(group.examples);
    for (const exc of rule.exceptions || []) addExamples(exc.examples);
    for (const pair of (rule.permitted || {}).pairs || []) words.add(pair.standard);
  }
  const appendix = data.appendix || {};
  for (const item of [...(appendix.with_okurigana || []), ...(appendix.without_okurigana || [])]) words.add(item.word);
  return words;
}

/** 本則の形ごとに、許容の形をまとめる。付表の語の許容の形も含める。 */
function variantGroups() {
  const groups = new Map();
  const add = (standard, permitted) => {
    if (!groups.has(standard)) groups.set(standard, new Set());
    groups.get(standard).add(permitted);
  };
  for (const rule of data.rules) {
    for (const pair of (rule.permitted || {}).pairs || []) for (const p of pair.permitted) add(pair.standard, p);
  }
  for (const item of (data.appendix || {}).with_okurigana || []) for (const p of item.permitted || []) add(item.word, p);
  return groups;
}

/** 形を拾う正規表現を作る。この形で始まる、より長い形の続きの字と、漢字で終わる形の後ろの漢字を除く。 */
function formPattern(form, allForms) {
  const nexts = [...new Set([...allForms].filter((f) => f !== form && f.startsWith(form)).map((f) => f[form.length]))].sort();
  let lookahead = nexts.join("");
  if (new RegExp(`[${KANJI}]`).test(form[form.length - 1])) lookahead = KANJI + lookahead;
  let pattern = `(?<![${KANJI}])${escape(form)}`;
  if (lookahead) pattern += `(?![${lookahead}])`;
  return new RegExp(pattern, "g");
}

/** 判定に使う組。許容の形が一つも使えない組は、混在を判定できないため外す。 */
function buildGroups() {
  const correct = correctWords();
  const groups = variantGroups();
  const allForms = new Set();
  for (const [standard, permitted] of groups) {
    allForms.add(standard);
    for (const p of permitted) allForms.add(p);
  }
  const result = [];
  for (const [standard, permitted] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const forms = [];
    for (const p of [...permitted].sort()) {
      if (p.length < 2) continue;
      const regex = formPattern(p, allForms);
      if ([...correct].some((w) => new RegExp(regex.source).test(w))) continue;
      forms.push({ form: p, regex });
    }
    if (forms.length === 0) continue;
    result.push({ standard, forms: [{ form: standard, regex: formPattern(standard, allForms) }, ...forms] });
  }
  return result;
}

const GROUPS = buildGroups();

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource, locator } = context;
  // 組ごとに、形ごとの出現を集める
  const found = GROUPS.map(() => new Map());
  return {
    [Syntax.Str](node) {
      const text = getSource(node);
      GROUPS.forEach((group, g) => {
        for (const { form, regex } of group.forms) {
          for (const m of text.matchAll(regex)) {
            if (!found[g].has(form)) found[g].set(form, []);
            found[g].get(form).push({ node, index: m.index });
          }
        }
      });
    },
    [`${Syntax.Document}:exit`]() {
      GROUPS.forEach((group, g) => {
        const used = found[g];
        if (used.size < 2) return;
        // 最も多い形にそろえる。同じ数なら本則の形にする
        let keep = group.standard;
        for (const [form, hits] of used) {
          const best = used.get(keep)?.length ?? 0;
          if (hits.length > best) keep = form;
        }
        for (const [form, hits] of used) {
          if (form === keep) continue;
          for (const { node, index } of hits) {
            report(
              node,
              new RuleError(`送り仮名の付け方が文書の中で混ざっている。「${form}」を「${keep}」にそろえる`, {
                padding: locator.range([index, index + form.length]),
              })
            );
          }
        }
      });
    },
  };
};
