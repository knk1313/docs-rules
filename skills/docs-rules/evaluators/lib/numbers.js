"use strict";
// NOT-012・NOT-013 の自前ルールが共通で使う、数の取り出しと除外の判定。
// custom-rules/ に置くとtextlintがルールとして読み込むため、ここに分けて置く。

// 算用数字の並び。桁区切りの「,」を含む形も1つの数として取る
const NUMBER_PATTERN = /[0-9][0-9,]*/g;

// 番号・年号・版など、桁を区切らない慣習のある数の後ろに来る字
const NO_SEPARATOR_SUFFIX = /^[年号番版回目期]/;

// 番号であることを示す語の後ろに来る数（「電話番号は09012345678」「〒1500001」「コード：12345」）
const IDENTIFIER_PREFIX = /(?:番号|コード|ID|〒)[はがをの：:\s]*$/;

/**
 * 数を区切らない慣習のある書き方か、数として読まない書き方かを判定する。
 * 英字や記号とつながった数（「ISO 8601」「U+301C」「v1.2.3」「2026-10-22」）、
 * 小数、年号や番号は、NOT-012・NOT-013 の対象にしない。
 * 0で始まる数（電話番号など）と、「番号」「〒」などの後ろの数も、番号とみなして対象にしない。
 * @param {string} text ノードの文字列
 * @param {number} start 数の開始位置
 * @param {number} end 数の終了位置（この位置の字は含まない）
 * @returns {boolean} 対象にしないときは true
 */
function isExcludedNumber(text, start, end) {
  const before = text.slice(Math.max(0, start - 2), start);
  const after = text.slice(end);
  // 直前・直後が英字や記号（「-」「.」「/」「:」「+」「#」「_」）なら、型番や日付、版の一部とみなす
  if (/[A-Za-z0-9_\-.+#/:@]$/.test(before)) return true;
  if (/^[A-Za-z_\-./:@]/.test(after)) return true;
  // 「ISO 8601」のように、英字とスペースの後に続く数は規格や型番の番号とみなす
  if (/[A-Za-z] $/.test(before)) return true;
  if (NO_SEPARATOR_SUFFIX.test(after)) return true;
  // 数量は0で始めないため、0で始まる2桁以上の数は番号とみなす
  if (/^0[0-9]/.test(text.slice(start, end))) return true;
  if (IDENTIFIER_PREFIX.test(text.slice(Math.max(0, start - 8), start))) return true;
  return false;
}

module.exports = { NUMBER_PATTERN, isExcludedNumber };
