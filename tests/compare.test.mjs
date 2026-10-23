// evaluators/compare.mjs が、書き直しの前後の採点結果を正しく比べるかを確かめる。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPARE = join(ROOT, "skills/docs-rules/evaluators/compare.mjs");

/** 採点結果の違反を作る。 */
function violation(ruleId, excerpt, line, judge = "機械") {
  return { rule_id: ruleId, line, column: 1, excerpt, fix: "", judge, checker: "textlint：test" };
}

/** 採点結果を一時ファイルに書き、compare.mjs に渡して結果を返す。 */
function run(results) {
  const dir = mkdtempSync(join(tmpdir(), "compare-"));
  try {
    const files = results.map((violations, i) => {
      const file = join(dir, `score-${i}.json`);
      writeFileSync(file, JSON.stringify({ file: "doc.md", checked_rules: [], skipped_rules: [], violations }));
      return file;
    });
    const r = spawnSync(process.execPath, [COMPARE, ...files], { encoding: "utf8" });
    return { status: r.status, out: r.status === 0 ? JSON.parse(r.stdout) : null, stderr: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** 違反の一覧を「ルールID：excerpt」の並びにする。 */
function ids(list) {
  return list.map((v) => `${v.rule_id}：${v.excerpt}`).sort();
}

test("直った違反、残った違反、新しく出た違反に分ける", () => {
  const { status, out } = run([
    [violation("FW-001", "することができる", 3), violation("NOT-016", "ヶ", 5)],
    [violation("NOT-016", "ヶ", 4), violation("NOT-002", "．", 6)],
  ]);
  assert.equal(status, 0);
  assert.equal(out.rewrites, 1);
  assert.deepEqual(ids(out.fixed), ["FW-001：することができる"]);
  assert.deepEqual(ids(out.remaining), ["NOT-016：ヶ"]);
  assert.deepEqual(ids(out.new), ["NOT-002：．"]);
  assert.deepEqual(out.stuck, []);
});

test("行がずれても、ルールIDとexcerptが同じなら同じ違反と見なす", () => {
  const { out } = run([[violation("NOT-016", "ヶ", 5)], [violation("NOT-016", "ヶ", 9)]]);
  assert.deepEqual(out.fixed, []);
  assert.deepEqual(out.new, []);
  assert.equal(out.remaining[0].line, 9);
});

test("同じ違反が複数あるときは件数で比べる", () => {
  const { out } = run([
    [violation("NOT-016", "ヶ", 1), violation("NOT-016", "ヶ", 2), violation("NOT-016", "ヶ", 3)],
    [violation("NOT-016", "ヶ", 2)],
  ]);
  assert.equal(out.fixed.length, 2);
  assert.equal(out.remaining.length, 1);
  assert.equal(out.new.length, 0);
});

test("直近3回の結果すべてにある違反を、2回続けて残った違反として返す", () => {
  const { out } = run([
    [violation("GRM-005", "目標の中心は", 2), violation("FW-001", "することができる", 3)],
    [violation("GRM-005", "目標の中心は", 2), violation("NOT-002", "．", 4)],
    [violation("GRM-005", "目標の中心は", 2), violation("NOT-002", "．", 4)],
  ]);
  assert.equal(out.rewrites, 2);
  assert.deepEqual(ids(out.stuck), ["GRM-005：目標の中心は"]);
  // NOT-002は2回目の採点で出たため、書き直しの後に残ったのは1回だけである
  assert.deepEqual(ids(out.remaining), ["GRM-005：目標の中心は", "NOT-002：．"]);
  assert.deepEqual(ids(out.fixed_total), ["FW-001：することができる"]);
});

test("一度直って再び出た違反は、2回続けて残った違反に入れない", () => {
  const { out } = run([[violation("NOT-016", "ヶ", 1)], [], [violation("NOT-016", "ヶ", 1)]]);
  assert.deepEqual(out.stuck, []);
  assert.deepEqual(ids(out.new), ["NOT-016：ヶ"]);
});

test("AI評価の違反は比べない", () => {
  const { out } = run([
    [violation("CMP-002", "経緯から書いている", 1, "AI")],
    [violation("CMP-002", "経緯から書いた", 1, "AI")],
  ]);
  assert.deepEqual(out.fixed, []);
  assert.deepEqual(out.new, []);
  assert.deepEqual(out.remaining, []);
});

test("ルールIDのない違反は、判定手段とexcerptで見分ける", () => {
  const a = { ...violation(null, "、", 1), checker: "textlint：max-ten" };
  const b = { ...violation(null, "、", 1), checker: "textlint：other" };
  const { out } = run([[a], [b]]);
  assert.equal(out.fixed.length, 1);
  assert.equal(out.new.length, 1);
});

test("採点結果が2つ未満なら、終了コード2を返す", () => {
  const { status, stderr } = run([[]]);
  assert.equal(status, 2);
  assert.match(stderr, /2つ以上/);
});
