// リポジトリ自身のMarkdownを evaluators/ で採点し、違反が0件であることを確かめる。
// ルールの型に由来する誤検出は、採点対象を書き換えず、lib/exclusions.mjs の除外条件で外す。
// 採点のテストは、score.mjs がパッケージを入れられないとき（終了コード3。npm がない、ネットワークがないなど）に飛ばす。
// markdownlint のテストは npx で markdownlint-cli2 を取得するため、npx が使えないときに飛ばす。どちらも飛ばしたことを出力する。
// CI（環境変数 CI がある）では、飛ばさずに失敗にする。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EXCLUSIONS, findExclusion } from "./lib/exclusions.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(ROOT, "skills/docs-rules");
const SCORE = join(SKILL, "evaluators/score.mjs");
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

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
const TARGET_FILES = ["README.md", "CONTRIBUTING.md", "AGENTS.md", "CLAUDE.md", "CODE_OF_CONDUCT.md", "SECURITY.md", "skills/docs-rules/SKILL.md", "skills/docs-rules-feedback/SKILL.md"];

function targets() {
  const files = [...TARGET_FILES];
  for (const dir of TARGET_DIRS) {
    for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".md")).sort()) files.push(`${dir}/${f}`);
  }
  return files;
}

/** 手元では飛ばし、CI（環境変数 CI がある）では失敗にする。CI で採点のテストが黙って飛ぶと、採点が壊れても気づけないため。 */
function skipOrFail(t, reason) {
  if (process.env.CI) assert.fail(reason);
  t.skip(reason);
}

function npxAvailable() {
  const r = spawnSync(NPX, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
  return r.status === 0;
}

test("repo: リポジトリのMarkdownをscore.mjsで採点し、違反が0件である", (t) => {
  // score.mjs に全ファイルを一度に渡し、textlint の起動を1回にまとめる。ファイルごとに起動すると、CI で1分近くかかる
  const r = spawnSync(process.execPath, [SCORE, ...targets()], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status === 3) {
    skipOrFail(t, `score.mjs が textlint か markdownlint-cli2 を実行できないため、採点のテストを飛ばした: ${r.stderr.trim().split("\n")[0]}`);
    return;
  }
  assert.ok(r.status === 0 || r.status === 1, `採点が終了コード ${r.status} で終わった: ${r.stderr}`);
  const problems = [];
  const used = new Set();
  for (const result of JSON.parse(r.stdout)) {
    const lines = readFileSync(join(ROOT, result.file), "utf8").split(/\r?\n/);
    const ctx = { file: result.file, lines };
    for (const v of result.violations) {
      const line = lines[v.line - 1] ?? "";
      const exclusion = findExclusion(v, line, ctx);
      if (exclusion) {
        used.add(exclusion.reason);
        continue;
      }
      problems.push(`${result.file}:${v.line}:${v.column} ${v.rule_id ?? "-"} ${v.checker} 「${v.excerpt}」`);
    }
  }
  assert.deepEqual(problems, [], `除外条件に当たらない違反がある:\n${problems.join("\n")}`);

  // どの指摘にも当たらなかった除外条件は、文書を直した結果、要らなくなったものである。残すと、後から入った本物の違反を隠しうる
  const unused = EXCLUSIONS.map((e) => e.reason).filter((reason) => !used.has(reason));
  assert.deepEqual(unused, [], `どの指摘にも当たらない除外条件がある。lib/exclusions.mjs から消す:\n${unused.join("\n")}`);
});

test("repo: リポジトリのMarkdownにmarkdownlint-cli2を当て、指摘が0件である", (t) => {
  if (!npxAvailable()) {
    skipOrFail(t, "npx が使えないため、markdownlint のテストを飛ばした");
    return;
  }
  const pkg = JSON.parse(readFileSync(join(SKILL, "evaluators/package.json"), "utf8"));
  const r = spawnSync(
    NPX,
    ["-y", `markdownlint-cli2@${pkg.dependencies["markdownlint-cli2"]}`, "--config", relative(ROOT, join(SKILL, "evaluators/docs-rules.markdownlint-cli2.jsonc")), "**/*.md"],
    { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" }
  );
  if (r.status !== 0 && r.status !== 1) {
    skipOrFail(t, `markdownlint-cli2 を実行できないため、テストを飛ばした:${(r.stderr || "").trim().split("\n")[0]}`);
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
