// tests/corpus/ の対の文で、機械で判定するルールの見逃しと誤検出を確かめる（#67）。
// 対の文は、違反した文と、それを直した文の組である。違反した文で期待したルールIDが出ること、直した文で何も出ないことを見る。
// 許した見逃しと誤検出は corpus/known.json に理由とともに固定し、一覧にないものが出たら失敗にする。
// 一覧にあるのに出なくなったものも失敗にする。採点を直した結果で要らなくなった項目を、一覧に残さないため。
// 人が書いた段落（corpus/human/）では、採点で出た指摘が、段落ごとの findings に記録した指摘と一致することを見る。
// 記録にない指摘が出たときと、記録した指摘が出なくなったときに失敗にする。
// パッケージを入れられないとき（終了コード3）は、手元では飛ばし、CI（環境変数 CI がある）では失敗にする。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { HUMAN_LABELS, ROOT, compareHuman, evaluate, loadHuman, loadKnown, loadPairs, scoreHuman, scorePairs } from "./lib/corpus.mjs";

const RULES_DIR = join(ROOT, "skills/docs-rules/rules");
const FIELDS = ["id", "rule_id", "violation", "fixed", "basis", "author", "reviewed_by"];

/** rules/*.md から、「判定：機械」のルールIDを集める。 */
function machineRules() {
  const ids = new Set();
  for (const file of readdirSync(RULES_DIR).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    let current = null;
    for (const line of readFileSync(join(RULES_DIR, file), "utf8").split("\n")) {
      const heading = line.match(/^### ([A-Z]+-\d{3}) /);
      if (heading) current = heading[1];
      if (current && line.startsWith("- 判定：機械")) ids.add(current);
    }
  }
  return ids;
}

const key = (x) => `${x.id} ${x.rule_id ?? "-"}`;

test("corpus: 対の文の項目がそろい、idが重複せず、機械で判定するルールを指す", () => {
  const machine = machineRules();
  const seen = new Set();
  for (const pair of loadPairs()) {
    for (const field of FIELDS) assert.ok(field in pair, `pairs/${pair.source_file} の ${pair.id ?? "(idなし)"} に ${field} がない`);
    assert.ok(!seen.has(pair.id), `id が重複している: ${pair.id}`);
    seen.add(pair.id);
    assert.ok(pair.id.startsWith(`${pair.rule_id}-`), `id の先頭がルールIDでない: ${pair.id}`);
    assert.ok(machine.has(pair.rule_id), `${pair.id} の ${pair.rule_id} は、機械で判定するルールでない`);
    assert.notEqual(pair.violation, pair.fixed, `${pair.id} の違反した文と直した文が同じ`);
  }
});

test("corpus: known.jsonの項目に理由があり、対の文のidを指す", () => {
  const ids = new Set(loadPairs().map((p) => p.id));
  const known = loadKnown();
  for (const item of [...known.misses, ...known.false_positives]) {
    assert.ok(ids.has(item.id), `known.json の ${item.id} は、対の文にない`);
    assert.ok(item.reason, `known.json の ${key(item)} に理由がない`);
  }
});

test("corpus: 違反した文で期待したルールIDが出て、直した文で何も出ない", (t) => {
  const pairs = loadPairs();
  const { code, stderr, results } = scorePairs(pairs);
  if (code === 3) {
    const reason = `score.mjs がパッケージを入れられないため、コーパスのテストを飛ばした: ${stderr.trim().split("\n")[0]}`;
    if (process.env.CI) assert.fail(reason);
    t.skip(reason);
    return;
  }
  assert.ok(code === 0 || code === 1, `採点が終了コード ${code} で終わった: ${stderr}`);
  const { misses, falsePositives } = evaluate(pairs, results);
  const known = loadKnown();

  const knownMisses = new Set(known.misses.map(key));
  const knownFalse = new Set(known.false_positives.map(key));
  const actualMisses = new Set(misses.map(key));
  // 同じ文で同じルールが2回出たときも、1件として扱う
  const actualFalse = new Set(falsePositives.map(key));

  const newMisses = [...actualMisses].filter((k) => !knownMisses.has(k));
  const newFalse = falsePositives.filter((f) => !knownFalse.has(key(f))).map((f) => `${key(f)} 「${f.excerpt}」`);
  assert.deepEqual(newMisses, [], `known.json にない見逃しがある:\n${newMisses.join("\n")}`);
  assert.deepEqual(newFalse, [], `known.json にない誤検出がある:\n${newFalse.join("\n")}`);

  const stale = [...[...knownMisses].filter((k) => !actualMisses.has(k)), ...[...knownFalse].filter((k) => !actualFalse.has(k))];
  assert.deepEqual(stale, [], `known.json にあるのに出なくなった項目がある。known.json から消す:\n${stale.join("\n")}`);
});

test("corpus: 人が書いた段落の項目がそろい、指摘ごとに判断と理由がある", () => {
  const seen = new Set();
  for (const item of loadHuman()) {
    for (const field of ["id", "text", "source", "findings", "reviewed_by"]) {
      assert.ok(field in item, `human/${item.source_file} の ${item.id ?? "(idなし)"} に ${field} がない`);
    }
    assert.ok(!seen.has(item.id), `id が重複している: ${item.id}`);
    seen.add(item.id);
    for (const field of ["title", "publisher", "url", "retrieved"]) {
      assert.ok(item.source[field], `${item.id} の source に ${field} がない`);
    }
    for (const f of item.findings) {
      assert.ok(HUMAN_LABELS.includes(f.label), `${item.id} の指摘「${f.excerpt}」の label が ${HUMAN_LABELS.join("、")} のどれでもない: ${f.label}`);
      if (f.label !== "違反") assert.ok(f.reason, `${item.id} の指摘「${f.excerpt}」は ${f.label} だが、理由がない`);
    }
  }
});

test("corpus: 人が書いた段落の採点結果が、記録した指摘と一致する", (t) => {
  const items = loadHuman();
  const { code, stderr, results } = scoreHuman(items);
  if (code === 3) {
    const reason = `score.mjs がパッケージを入れられないため、コーパスのテストを飛ばした: ${stderr.trim().split("\n")[0]}`;
    if (process.env.CI) assert.fail(reason);
    t.skip(reason);
    return;
  }
  assert.ok(code === 0 || code === 1, `採点が終了コード ${code} で終わった: ${stderr}`);
  const { unrecorded, stale } = compareHuman(items, results);
  const fmt = (x) => `${x.id} ${x.key ?? `${x.checker}\t${x.column}\t${x.excerpt}`}`;
  assert.deepEqual(unrecorded.map(fmt), [], `findings にない指摘が出た。判断して findings に足す:\n${unrecorded.map(fmt).join("\n")}`);
  assert.deepEqual(stale.map(fmt), [], `findings にあるのに出なくなった指摘がある。findings から消す:\n${stale.map(fmt).join("\n")}`);
});
