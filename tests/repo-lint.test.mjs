// リポジトリ自身のMarkdownを evaluators/ で採点し、違反が0件であることを確かめる。
// ルールの型に由来する誤検出は、採点対象を書き換えず、このファイルの除外条件で外す。
// Node.js か npx が使えないとき、パッケージを取得できないときは、テストを飛ばしてそのことを出力する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(ROOT, "skills/docs-rules");
const SCORE = join(SKILL, "evaluators/score.mjs");
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const CONCURRENCY = 3;

// 採点の対象。.github/ のテンプレートは対象外（#27）
const TARGET_DIRS = ["skills/docs-rules/rules", "skills/docs-rules/schemas", "skills/docs-rules/templates", "skills/docs-rules/references", "docs"];
const TARGET_FILES = ["README.md", "CONTRIBUTING.md"];

function targets() {
  const files = [...TARGET_FILES];
  for (const dir of TARGET_DIRS) {
    for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".md")).sort()) files.push(`${dir}/${f}`);
  }
  return files;
}

/** 行の中の「」で囲まれた範囲を、[開始, 終了] の桁（1始まり）の組で返す。入れ子の「」は外側の範囲に含める。 */
function quotedRanges(line) {
  const ranges = [];
  let depth = 0;
  let start = 0;
  Array.from(line).forEach((ch, i) => {
    if (ch === "「") {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (ch === "」" && depth > 0) {
      depth -= 1;
      if (depth === 0) ranges.push([start, i + 1]);
    }
  });
  return ranges;
}

/** 桁を、文字単位（サロゲートペアを1字と数える）に直す。score.mjs の桁はUTF-16の単位のため。 */
function charColumn(line, column) {
  return Array.from(line.slice(0, column - 1)).length + 1;
}

/** examples.md で、その行が「### …の失敗例」の節の中にあるかを判定する。 */
function inFailureExample(ctx, lineNumber) {
  if (!ctx.file.endsWith("rules/examples.md")) return false;
  for (let i = lineNumber - 1; i >= 0; i -= 1) {
    const m = ctx.lines[i].match(/^#{1,3} (.+)$/);
    if (m) return m[1].endsWith("の失敗例");
  }
  return false;
}

// 除外条件。ルールの型に由来する誤検出だけを挙げる。match は (指摘, 行の文字列, { file, lines }) を受け取る
const EXCLUSIONS = [
  {
    // examples.md の失敗例の段落。違反を含めて書いてある
    reason: "examples.mdの失敗例",
    match: (v, line, ctx) => line.startsWith(">") && inFailureExample(ctx, v.line),
  },
  {
    // 見出しのルールIDの後のスペース（「### FW-001 …」）
    reason: "見出しのルールIDの後のスペース",
    match: (v, line) => /^### [A-Z]+-\d{3} /.test(line) && v.checker === "textlint：ja-space-between-half-and-full-width",
  },
  {
    // 出典欄の資料名と項目番号の間のスペース（「JTFスタイルガイド 2.1.5」「内閣告示 常用漢字表」）と、
    // 項目番号に含まれる半角の括弧（「Ⅱ5ウ(イ)」。rules/README.md の略称の表の書き方）
    reason: "出典欄の資料名と項目番号",
    match: (v, line) =>
      line.startsWith("- 出典：") &&
      ["textlint：ja-space-between-half-and-full-width", "textlint：ja-no-space-between-full-width", "textlint：jtf-style/4.3.1.丸かっこ（）"].includes(v.checker),
  },
  {
    // 判定欄はルール名を並べたデータで、ルール名に半角の括弧や「.」を含む（NOT-025の注記）
    reason: "判定欄のルール名",
    match: (v, line) => line.startsWith("- 判定："),
  },
  {
    // 「」の中に例示した語や記号（「.」「,」、NOT-011の「-er」、失敗例の文）
    reason: "「」の中の例示",
    match: (v, line) => {
      if (!v.column) return false;
      const col = charColumn(line, v.column);
      return quotedRanges(line).some(([s, e]) => col > s && col < e);
    },
  },
];

function npxAvailable() {
  const r = spawnSync(NPX, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
  return r.status === 0;
}

/** score.mjs を非同期で実行する。 */
function score(file) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [SCORE, file], { cwd: ROOT });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolvePromise({ file, code, stdout, stderr }));
  });
}

test("repo: リポジトリのMarkdownをscore.mjsで採点し、違反が0件である", async (t) => {
  if (!npxAvailable()) {
    t.skip("npx が使えないため、採点のテストを飛ばした");
    return;
  }
  // textlint はファイルごとに起動するため、同時に動かす数を絞ってメモリの使いすぎを防ぐ
  const queue = targets();
  const results = [];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) results.push(await score(queue.shift()));
  });
  await Promise.all(workers);
  if (results.some((r) => r.code === 3)) {
    t.skip(`textlint か markdownlint-cli2 を取得できないため、採点のテストを飛ばした: ${results.find((r) => r.code === 3).stderr.trim()}`);
    return;
  }
  const problems = [];
  for (const r of results) {
    assert.ok(r.code === 0 || r.code === 1, `${r.file} の採点が終了コード ${r.code} で終わった: ${r.stderr}`);
    const lines = readFileSync(join(ROOT, r.file), "utf8").split(/\r?\n/);
    const ctx = { file: r.file, lines };
    for (const v of JSON.parse(r.stdout).violations) {
      const line = lines[v.line - 1] ?? "";
      if (EXCLUSIONS.some((e) => e.match(v, line, ctx))) continue;
      problems.push(`${r.file}:${v.line}:${v.column} ${v.rule_id ?? "-"} ${v.checker} 「${v.excerpt}」`);
    }
  }
  assert.deepEqual(problems, [], `除外条件に当たらない違反がある:\n${problems.join("\n")}`);
});

test("repo: リポジトリのMarkdownにmarkdownlint-cli2を当て、指摘が0件である", (t) => {
  if (!npxAvailable()) {
    t.skip("npx が使えないため、markdownlint のテストを飛ばした");
    return;
  }
  const pkg = JSON.parse(readFileSync(join(SKILL, "evaluators/package.json"), "utf8"));
  const r = spawnSync(
    NPX,
    ["-y", `markdownlint-cli2@${pkg.dependencies["markdownlint-cli2"]}`, "--config", relative(ROOT, join(SKILL, "evaluators/.markdownlint-cli2.jsonc")), "**/*.md"],
    { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" }
  );
  if (r.status !== 0 && r.status !== 1) {
    t.skip(`markdownlint-cli2 を実行できないため、テストを飛ばした: ${(r.stderr || "").trim().split("\n")[0]}`);
    return;
  }
  assert.equal(r.status, 0, `markdownlint-cli2 の指摘がある:\n${r.stderr}`);
});
