// tests/ai-eval/ の対の文と結果のファイルの形を確かめる（#77）。
// AI評価はモデルを呼ぶため、CIでは評価しない。記録した結果を読み、集計が動くことだけを見る。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/corpus.mjs";
import { docName, judge, loadAiPairs, loadResults, summarizeAi } from "./lib/ai-eval.mjs";

const RULES_DIR = join(ROOT, "skills/docs-rules/rules");
const FIELDS = ["id", "rule_id", "violation", "fixed", "basis", "author", "reviewed_by"];

/** rules/*.md から、AIで評価するルールIDを集める。判定：AIのルールと、注記に「AI評価で扱う」がある判定：機械のルール。 */
function aiRules() {
  const ids = new Set();
  for (const file of readdirSync(RULES_DIR).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    let current = null;
    for (const line of readFileSync(join(RULES_DIR, file), "utf8").split("\n")) {
      const heading = line.match(/^### ([A-Z]+-\d{3}) /);
      if (heading) current = heading[1];
      if (!current) continue;
      if (line === "- 判定：AI" || (line.startsWith(">") && line.includes("AI評価で扱う"))) ids.add(current);
    }
  }
  return ids;
}

test("ai-eval: 対の文の項目がそろい、idが重複せず、AIで評価するルールを指す", () => {
  const ai = aiRules();
  const seen = new Set();
  for (const pair of loadAiPairs()) {
    for (const field of FIELDS) assert.ok(field in pair, `ai-eval/pairs/${pair.source_file} の ${pair.id ?? "(idなし)"} に ${field} がない`);
    assert.ok(!seen.has(pair.id), `id が重複している: ${pair.id}`);
    seen.add(pair.id);
    assert.ok(pair.id.startsWith(`${pair.rule_id}-`), `id の先頭がルールIDでない: ${pair.id}`);
    assert.ok(ai.has(pair.rule_id), `${pair.id} の ${pair.rule_id} は、AIで評価するルールでない`);
    assert.notEqual(pair.violation, pair.fixed, `${pair.id} の違反した文と直した文が同じ`);
  }
});

test("ai-eval: 結果のファイルが、モデルと回を持ち、対の文の文書だけを含む", () => {
  const names = new Set(loadAiPairs().flatMap((p) => [docName(p.id, "violation"), docName(p.id, "fixed")]));
  for (const result of loadResults()) {
    assert.equal(typeof result.model, "string", `${result.result_file} に model がない`);
    assert.ok(Number.isInteger(result.run) && result.run >= 1, `${result.result_file} の run が1以上の整数でない`);
    for (const [name, ids] of Object.entries(result.documents)) {
      assert.ok(names.has(name), `${result.result_file} の ${name} は、対の文にない`);
      assert.ok(Array.isArray(ids) && ids.every((id) => typeof id === "string"), `${result.result_file} の ${name} の指摘がルールIDの配列でない`);
    }
  }
  // 集計が例外なく動くこと
  summarizeAi(judge(loadAiPairs(), loadResults()));
});
