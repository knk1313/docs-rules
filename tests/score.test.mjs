// evaluators/score.mjs が、違反を含む決まった文書で期待するルールIDと終了コードを返すことを確かめる。
// repo-lint.test.mjs はリポジトリの文書で違反が0件になることだけを見るため、採点が常に0件を返すように壊れても気づけない。
// パッケージを入れられないとき（終了コード3）は、手元では飛ばし、CI（環境変数 CI がある）では失敗にする。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCORE = join(ROOT, "skills/docs-rules/evaluators/score.mjs");
const WORK = mkdtempSync(join(tmpdir(), "docs-rules-score-test-"));

/** 文書を一時的な場所に書き、score.mjs で採点する。 */
function score(name, text, args = [], env = {}) {
  const file = join(WORK, name);
  writeFileSync(file, text);
  return run([file, ...args], env);
}

/** score.mjs を引数のとおりに実行する。 */
function run(args, env = {}) {
  const r = spawnSync(process.execPath, [SCORE, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { code: r.status, stderr: r.stderr, result: r.status === 0 || r.status === 1 ? JSON.parse(r.stdout) : null };
}

/** パッケージを入れられないときは、手元では飛ばし、CI では失敗にする。飛ばしたときは true を返す。 */
function skipWithoutPackages(t, r) {
  if (r.code !== 3) return false;
  const reason = `score.mjs がパッケージを入れられない: ${r.stderr.trim().split("\n")[0]}`;
  if (process.env.CI) assert.fail(reason);
  t.skip(`${reason}。採点のテストを飛ばした`);
  return true;
}

const ids = (r) => r.result.violations.map((v) => v.rule_id);

test("score: 違反のない文書は、終了コード0で違反が0件になる", (t) => {
  const r = score("clean.md", "# 設定の手順\n\n設定を変更する。\n");
  if (skipWithoutPackages(t, r)) return;
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.result.violations, []);
});

test("score: 既知の違反を含む文書は、終了コード1で各ルールIDを返す", (t) => {
  const text = [
    "# 設定の手順",
    "",
    "Claude Code の設定を開く。",
    "",
    "予算は120000000円である。",
    "",
    "原因は設定の誤りかもしれない。",
    "",
    "* 項目",
    "",
  ].join("\n");
  const r = score("violations.md", text);
  if (skipWithoutPackages(t, r)) return;
  assert.equal(r.code, 1, r.stderr);
  for (const id of ["NOT-022", "NOT-013", "FW-004", "MKD-004"]) {
    assert.ok(ids(r).includes(id), `${id} が見つからない: ${JSON.stringify(r.result.violations, null, 2)}`);
  }
  const not013 = r.result.violations.find((v) => v.rule_id === "NOT-013");
  assert.equal(not013.fix, "「120000000」→「1億2,000万」");
});

test("score: 電話番号や郵便番号を、数量として直す候補にしない", (t) => {
  const r = score("numbers.md", "# 連絡先\n\n電話番号は09012345678、郵便番号は1500001である。〒1500001に送る。\n");
  if (skipWithoutPackages(t, r)) return;
  const numbers = r.result.violations.filter((v) => v.rule_id === "NOT-012" || v.rule_id === "NOT-013");
  assert.deepEqual(numbers, []);
});

test("score: 複数の判定手段が同じ箇所を指摘したときは、1件にまとめる", (t) => {
  // 文末の「．」は、ja-no-mixed-period と docs-rules/not-002 の両方が指摘する
  const r = score("duplicate.md", "# 設定の手順\n\n設定を変更する．\n");
  if (skipWithoutPackages(t, r)) return;
  const not002 = r.result.violations.filter((v) => v.rule_id === "NOT-002");
  assert.equal(not002.length, 1, JSON.stringify(r.result.violations, null, 2));
});

test("score: 一部だけ機械で判定するルールは、機械で判定しない部分をskipped_rulesに出す", (t) => {
  const r = score("partial.md", "# 設定の手順\n\n設定を変更する。\n");
  if (skipWithoutPackages(t, r)) return;
  const skipped = r.result.skipped_rules.map((s) => s.rule_id);
  for (const id of ["GRM-001", "GRM-002", "GRM-005", "NOT-006", "NOT-008"]) {
    assert.ok(skipped.includes(id), `${id} が skipped_rules にない`);
    assert.ok(r.result.checked_rules.includes(id), `${id} が checked_rules にない`);
  }
});

test("score: --typeで、必須セクションの欠落と順序、残った案内のコメントを返す", (t) => {
  const text = [
    "# 提案",
    "",
    "## 背景と課題",
    "",
    "本文を書く。",
    "",
    "## 決めてほしいこと",
    "",
    "<!-- 案内のコメント -->",
    "",
    "記法の説明では「<!--」と書く。",
    "",
    "    <!-- 字下げのコードブロックの中 -->",
    "",
  ].join("\n");
  const r = score("schema.md", text, ["--type", "proposal"]);
  if (skipWithoutPackages(t, r)) return;
  assert.equal(r.code, 1, r.stderr);
  const schema = r.result.violations.filter((v) => v.rule_id === "SCHEMA");
  assert.ok(schema.some((v) => v.line === null && v.excerpt === "## 推奨案と理由"), "必須セクションの欠落を返していない");
  assert.ok(schema.some((v) => v.line === 7 && v.excerpt === "## 決めてほしいこと"), "必須セクションの順序の誤りを返していない");
  const comments = schema.filter((v) => v.fix === "テンプレートの案内のコメントを消す").map((v) => v.line);
  assert.deepEqual(comments, [9], "案内のコメントとして返す行が、9行目だけになっていない");
  assert.ok(r.result.checked_rules.includes("SCHEMA"));
});

test("score: --type ui-textで、文言表の種別に固有のルールを判定し、例外に当たる共通ルールの違反を外す", (t) => {
  const text = [
    "# 画面の文言",
    "",
    "## 対象の画面",
    "",
    "一覧の画面だけを扱う。",
    "",
    "## 用語表",
    "",
    "揺れやすい語はない。",
    "",
    "## 文言",
    "",
    "### 一覧",
    "",
    "一覧の文言は次のとおり。",
    "",
    "| 要素 | 文言 | 上限 |",
    "| --- | --- | --- |",
    "| サブタイトル | 本画面では申請を管理する機能です | 10 |",
    "| プレースホルダー | 例）2026年10月28日 | |",
    "| ラベル | 領収書の画像はありますか？ | 20 |",
    "| ボタン | 送信しますか？ | 20 |",
    "",
    "## エラーと空の状態",
    "",
    "エラーと空の状態の文言は次のとおり。",
    "",
    "| 画面 | 要素 | 文言 | 上限 |",
    "| --- | --- | --- | --- |",
    "| 一覧 | エラー | おっと。エラーが発生しました。申し訳ありません。 | 60 |",
    "",
    "## 未決定の文言",
    "",
    "決まっていない文言はない。",
    "",
  ].join("\n");
  const r = score("ui-text.md", text, ["--type", "ui-text"]);
  if (skipWithoutPackages(t, r)) return;
  assert.equal(r.code, 1, r.stderr);
  const found = (id, line) => r.result.violations.some((v) => v.rule_id === id && v.line === line);
  for (const [id, line] of [
    ["UI-009", 19],
    ["UI-010", 19],
    ["UI-005", 20],
    ["UI-009", 20],
    ["UI-001", 30],
    ["UI-011", 30],
    ["UI-012", 30],
  ]) {
    assert.ok(found(id, line), `${line}行目の ${id} が見つからない: ${JSON.stringify(r.result.violations, null, 2)}`);
  }
  assert.ok(!found("NOT-003", 21), "問いの形のラベルの「？」を、NOT-003の違反にしている");
  assert.ok(found("NOT-003", 22), "ボタンの「？」を、NOT-003の違反にしていない");
  for (const id of ["UI-001", "UI-005", "UI-009", "UI-010"]) assert.ok(r.result.checked_rules.includes(id), `checked_rules に ${id} がない`);
});

test("score: --typeを渡さないときは、種別に固有のルールを判定しない", (t) => {
  const r = score("no-type.md", "# 画面\n\n| 要素 | 文言 | 上限 |\n| --- | --- | --- |\n| プレースホルダー | 例 | 1 |\n");
  if (skipWithoutPackages(t, r)) return;
  assert.ok(!r.result.checked_rules.some((id) => id.startsWith("UI-")));
  assert.ok(!ids(r).some((id) => id?.startsWith("UI-")));
});

test("score: 引数の誤りと読めない入力は、終了コード2になる", () => {
  const file = join(WORK, "args.md");
  writeFileSync(file, "# 見出し\n\n本文を書く。\n");
  const cases = [
    { args: [], why: "文書のパスがない" },
    { args: [join(WORK, "missing.md")], why: "存在しない文書" },
    { args: [WORK], why: "ディレクトリ" },
    { args: [file, "--type"], why: "値のない--type" },
    { args: [file, "--type", "--foo"], why: "値の代わりにオプションが続く--type" },
    { args: [file, "--type", "unknown"], why: "schemas/にない識別名" },
    { args: [file, "--foo"], why: "知らないオプション" },
    { args: [file, join(WORK, "missing.md")], why: "二つ目の文書が存在しない" },
  ];
  for (const { args, why } of cases) {
    const r = run(args);
    assert.equal(r.code, 2, `${why}で終了コードが2にならない: ${r.code} ${r.stderr}`);
  }
});

test("score: 文書を二つ以上渡すと、文書ごとの結果を配列で返す", (t) => {
  // 別々のディレクトリに置き、markdownlint-cli2 をディレクトリごとに起動する場合も確かめる
  const sub = mkdtempSync(join(WORK, "multi-"));
  const clean = join(WORK, "multi-clean.md");
  const dirty = join(sub, "multi-dirty.md");
  writeFileSync(clean, "# 見出し\n\n本文を書く。\n");
  writeFileSync(dirty, "# 見出し\n\n確認することができる。\n\n### 飛ばした見出し\n");
  const r = run([clean, dirty, clean]);
  if (skipWithoutPackages(t, r)) return;
  assert.equal(r.code, 1, r.stderr);
  // 同じ文書を二度渡しても、結果は一つにする
  assert.deepEqual(r.result.map((x) => x.file), [clean, dirty]);
  assert.deepEqual(r.result[0].violations, []);
  const dirtyIds = r.result[1].violations.map((v) => v.rule_id);
  assert.ok(dirtyIds.includes("FW-001"), `textlint の違反が二つ目の文書に付いていない: ${dirtyIds}`);
  assert.ok(dirtyIds.includes("MKD-001"),`markdownlint の違反が二つ目の文書に付いていない: ${dirtyIds}`);
});

test("score: --type=<識別名>の形も受け付ける", (t) => {
  const r = score("type-equals.md", "# 提案\n\n本文を書く。\n", ["--type=proposal"]);
  if (skipWithoutPackages(t, r)) return;
  assert.equal(r.code, 1, r.stderr);
  assert.ok(r.result.checked_rules.includes("SCHEMA"));
});

test("score: パッケージを入れる場所を作れないときは、終了コード3になる", () => {
  // キャッシュの場所に通常のファイルの下を指定し、場所を作れないようにする
  const blocker = join(WORK, "not-a-directory");
  writeFileSync(blocker, "");
  const r = score("no-cache.md", "# 見出し\n\n本文を書く。\n", [], { DOCS_RULES_CACHE_DIR: join(blocker, "cache") });
  assert.equal(r.code, 3, r.stderr);
});
