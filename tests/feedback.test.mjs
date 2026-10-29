// skills/docs-rules-feedback/scripts/feedback.mjs が、改善点の候補を追記、一覧、削除できることを確かめる。
// 利用者のキャッシュを汚さないよう、DOCS_RULES_CACHE_DIR に一時的な場所を渡す。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FEEDBACK = join(ROOT, "skills/docs-rules-feedback/scripts/feedback.mjs");

/** 一時的なキャッシュの場所で feedback.mjs を実行する。 */
function run(cache, args, input) {
  const r = spawnSync(process.execPath, [FEEDBACK, ...args], {
    encoding: "utf8",
    input,
    env: { ...process.env, DOCS_RULES_CACHE_DIR: cache },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("feedback: 追記した候補を一覧で返し、消した候補を一覧から外す", () => {
  const cache = mkdtempSync(join(tmpdir(), "docs-rules-feedback-test-"));
  const first = run(cache, ["add", JSON.stringify({ type: "ui-text", rule_id: "NOT-003", scene: "誤検出", reason: "ボタンの「？」", excerpt: "送信しますか？" })]);
  assert.equal(first.code, 0, first.stderr);
  // 標準入力からも受け付ける。「'」を含む JSON を引数で渡せないときのため
  const second = run(cache, ["add"], JSON.stringify({ scene: "当てはまる種別なし", reason: "議事録を頼まれた" }));
  assert.equal(second.code, 0, second.stderr);

  const listed = JSON.parse(run(cache, ["list"]).stdout);
  assert.equal(listed.length, 2);
  assert.equal(listed[0].rule_id, "NOT-003");
  assert.equal(listed[1].rule_id, null);
  for (const e of listed) assert.ok(e.id && e.recorded_at, "id と recorded_at が付いていない");

  const removed = run(cache, ["remove", listed[0].id]);
  assert.equal(removed.code, 0, removed.stderr);
  assert.deepEqual(JSON.parse(removed.stdout), { removed: 1, remaining: 1 });
  assert.deepEqual(
    JSON.parse(run(cache, ["list"]).stdout).map((e) => e.id),
    [listed[1].id]
  );
});

test("feedback: 候補がないときは空の配列を返す", () => {
  const cache = mkdtempSync(join(tmpdir(), "docs-rules-feedback-test-"));
  const r = run(cache, ["list"]);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), []);
});

test("feedback: 場面や理由のない候補と、知らないコマンドは終了コード2になる", () => {
  const cache = mkdtempSync(join(tmpdir(), "docs-rules-feedback-test-"));
  const cases = [
    { args: ["add", JSON.stringify({ scene: "その他", reason: "理由" })], why: "知らない場面" },
    { args: ["add", JSON.stringify({ scene: "誤検出" })], why: "理由がない" },
    { args: ["add", "{"], why: "JSON の誤り" },
    { args: ["add", "[]"], why: "オブジェクトでない" },
    { args: ["remove"], why: "消す id がない" },
    { args: [], why: "コマンドがない" },
    { args: ["foo"], why: "知らないコマンド" },
  ];
  for (const { args, why } of cases) {
    const r = run(cache, args);
    assert.equal(r.code, 2, `${why}で終了コードが2にならない: ${r.code} ${r.stderr}`);
  }
  assert.deepEqual(JSON.parse(run(cache, ["list"]).stdout), [], "誤った候補を追記している");
});
