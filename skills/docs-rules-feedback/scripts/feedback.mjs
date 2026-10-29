#!/usr/bin/env node
// docs-rules の改善点の候補を、利用者の手元にためる（#63）。
//
// 使い方:
//   node feedback.mjs add '<JSON>'     候補を1件追記する。JSON を引数に渡さないときは標準入力から読む
//   node feedback.mjs list             ためた候補を JSON の配列で返す
//   node feedback.mjs remove <id> ...  Issue にした候補を消す
//   node feedback.mjs path             ためるファイルのパスを返す
//
// ためる場所は score.mjs と同じ利用者のキャッシュで、ファイルは feedback.jsonl（1件1行の JSON）である。
// 環境変数 DOCS_RULES_CACHE_DIR で変えられる。Node.js の標準モジュールだけで書く。
//
// 終了コード:
//   0 成功 / 2 引数の誤り

import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const EXIT_OK = 0;
const EXIT_USAGE = 2;

// 候補にする場面（docs-rules の SKILL.md の「改善点の候補」）
const SCENES = ["誤検出", "直せない違反", "手で直した箇所", "当てはまる種別なし"];

const USAGE = "使い方: node feedback.mjs add '<JSON>' | list | remove <id> ... | path\n";

/** ためる場所を返す。score.mjs の cacheRoot と同じ規則にする。 */
function cacheRoot() {
  if (process.env.DOCS_RULES_CACHE_DIR) return resolve(process.env.DOCS_RULES_CACHE_DIR);
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "docs-rules");
  if (process.platform === "darwin") return join(homedir(), "Library", "Caches", "docs-rules");
  return join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "docs-rules");
}

const FILE = join(cacheRoot(), "feedback.jsonl");

/** ためた候補を読む。読めない行は飛ばす。 */
function load() {
  if (!existsSync(FILE)) return [];
  const entries = [];
  for (const line of readFileSync(FILE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // 書きかけで途切れた行などは飛ばす
    }
  }
  return entries;
}

/** 候補を検証し、id と記録した日時を付けて返す。誤りがあれば理由を投げる。 */
function normalize(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("JSON はオブジェクトで渡す");
  if (!SCENES.includes(input.scene)) throw new Error(`scene は ${SCENES.join("、")} のどれかにする`);
  if (typeof input.reason !== "string" || !input.reason.trim()) throw new Error("reason に理由を書く");
  return {
    id: randomUUID().slice(0, 8),
    recorded_at: new Date().toISOString(),
    type: typeof input.type === "string" ? input.type : null,
    rule_id: typeof input.rule_id === "string" ? input.rule_id : null,
    scene: input.scene,
    reason: input.reason.trim(),
    // 抜粋は手元にだけ残す。Issue に載せるかは、起票のときに利用者が決める
    excerpt: typeof input.excerpt === "string" ? input.excerpt : null,
  };
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "path") {
    process.stdout.write(`${FILE}\n`);
    return EXIT_OK;
  }
  if (command === "list") {
    process.stdout.write(`${JSON.stringify(load(), null, 2)}\n`);
    return EXIT_OK;
  }
  if (command === "add") {
    let entry;
    try {
      const text = rest.length > 0 ? rest.join(" ") : readFileSync(0, "utf8");
      entry = normalize(JSON.parse(text));
    } catch (e) {
      process.stderr.write(`候補を追記できない: ${e.message}\n${USAGE}`);
      return EXIT_USAGE;
    }
    mkdirSync(cacheRoot(), { recursive: true });
    appendFileSync(FILE, `${JSON.stringify(entry)}\n`);
    process.stdout.write(`${JSON.stringify(entry)}\n`);
    return EXIT_OK;
  }
  if (command === "remove" && rest.length > 0) {
    const ids = new Set(rest);
    const entries = load();
    const kept = entries.filter((e) => !ids.has(e.id));
    // 一時的なファイルに書いてから名前を変え、途中で止まっても元のファイルを壊さない
    const work = `${FILE}.${process.pid}.tmp`;
    writeFileSync(work, kept.map((e) => `${JSON.stringify(e)}\n`).join(""));
    renameSync(work, FILE);
    process.stdout.write(`${JSON.stringify({ removed: entries.length - kept.length, remaining: kept.length })}\n`);
    return EXIT_OK;
  }
  process.stderr.write(USAGE);
  return EXIT_USAGE;
}

process.exitCode = main();
