// リポジトリ自身のMarkdownを evaluators/ で採点し、違反が0件であることを確かめる。
// ルールの型に由来する誤検出は、採点対象を書き換えず、lib/exclusions.mjs の除外条件で外す。
// 採点のテストは、score.mjs がパッケージを入れられないとき（終了コード3。npm がない、ネットワークがないなど）に飛ばす。
// markdownlint のテストは npx で markdownlint-cli2 を取得するため、npx が使えないときに飛ばす。どちらも飛ばしたことを出力する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EXCLUSIONS, findExclusion } from "./lib/exclusions.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(ROOT, "skills/docs-rules");
const SCORE = join(SKILL, "evaluators/score.mjs");
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const CONCURRENCY = 3;

// 採点の対象。.github/ のテンプレートは対象外（#27）。ディレクトリは直下の .md だけを見る
const TARGET_DIRS = [
  "skills/docs-rules/rules",
  "skills/docs-rules/schemas",
  "skills/docs-rules/templates",
  "skills/docs-rules/prompts",
  "skills/docs-rules/references",
  "skills/docs-rules/evaluators",
  "skills/docs-rules/evaluators/data",
  "docs",
  "tests",
];
const TARGET_FILES = ["README.md", "CONTRIBUTING.md", "AGENTS.md", "CLAUDE.md", "CODE_OF_CONDUCT.md", "SECURITY.md", "skills/docs-rules/SKILL.md"];

function targets() {
  const files = [...TARGET_FILES];
  for (const dir of TARGET_DIRS) {
    for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".md")).sort()) files.push(`${dir}/${f}`);
  }
  return files;
}

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
  // score.mjs は npx ではなく npm ci でパッケージを入れる。先に1件だけ採点して、入れられるかを確かめる。
  // 初回の取得もここで済むため、後の並行の採点がパッケージを入れる処理を取り合わない
  const first = await score(TARGET_FILES[0]);
  if (first.code === 3) {
    t.skip(`score.mjs がパッケージを入れられないため、採点のテストを飛ばした: ${first.stderr.trim().split("\n")[0]}`);
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
  const used = new Set();
  for (const r of results) {
    assert.ok(r.code === 0 || r.code === 1, `${r.file} の採点が終了コード ${r.code} で終わった: ${r.stderr}`);
    const lines = readFileSync(join(ROOT, r.file), "utf8").split(/\r?\n/);
    const ctx = { file: r.file, lines };
    for (const v of JSON.parse(r.stdout).violations) {
      const line = lines[v.line - 1] ?? "";
      const exclusion = findExclusion(v, line, ctx);
      if (exclusion) {
        used.add(exclusion.reason);
        continue;
      }
      problems.push(`${r.file}:${v.line}:${v.column} ${v.rule_id ?? "-"} ${v.checker} 「${v.excerpt}」`);
    }
  }
  assert.deepEqual(problems, [], `除外条件に当たらない違反がある:\n${problems.join("\n")}`);

  // どの指摘にも当たらなかった除外条件は、文書を直した結果、要らなくなったものである。残すと、後から入った本物の違反を隠しうる
  const unused = EXCLUSIONS.map((e) => e.reason).filter((reason) => !used.has(reason));
  assert.deepEqual(unused, [], `どの指摘にも当たらない除外条件がある。lib/exclusions.mjs から消す:\n${unused.join("\n")}`);
});

test("repo: リポジトリのMarkdownにmarkdownlint-cli2を当て、指摘が0件である", (t) => {
  if (!npxAvailable()) {
    t.skip("npx が使えないため、markdownlint のテストを飛ばした");
    return;
  }
  const pkg = JSON.parse(readFileSync(join(SKILL, "evaluators/package.json"), "utf8"));
  const r = spawnSync(
    NPX,
    ["-y", `markdownlint-cli2@${pkg.dependencies["markdownlint-cli2"]}`, "--config", relative(ROOT, join(SKILL, "evaluators/docs-rules.markdownlint-cli2.jsonc")), "**/*.md"],
    { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" }
  );
  if (r.status !== 0 && r.status !== 1) {
    t.skip(`markdownlint-cli2 を実行できないため、テストを飛ばした: ${(r.stderr || "").trim().split("\n")[0]}`);
    return;
  }
  assert.equal(r.status, 0, `markdownlint-cli2 の指摘がある:\n${r.stderr}`);
});

/** ディレクトリの下にある「.」で始まるファイルとディレクトリを、ルートからの相対パスで返す。 */
function dotEntries(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.name.startsWith(".")) return [relative(ROOT, path)];
    return entry.isDirectory() ? dotEntries(path) : [];
  });
}

// スキルをzipでアップロードする経路などで「.」で始まるファイルが落ち、採点が設定なしで動かなくなるため
test("repo: skills/の下に「.」で始まるファイルを置かない", () => {
  assert.deepEqual(dotEntries(join(ROOT, "skills")), [], "「.」で始まる名前を変え、参照している箇所も直す");
});
