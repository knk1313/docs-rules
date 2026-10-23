#!/usr/bin/env node
// docs-rules のルールベース採点の入口（#21）。
//
// 使い方（リポジトリの直下から）:
//   node skills/docs-rules/evaluators/score.mjs <文書のパス> [--type <識別名>]
//
// textlint と markdownlint-cli2 を呼び、結果を docs-rules のルールIDに直して JSON で返す。
// --type に文書種別の識別名（session-log、proposal など）を渡すと、schemas/ の必須セクション表と
// 文書の見出しも突き合わせる。Node.js の標準モジュールだけで書き、利用者に npm install を求めない。
//
// 採点で使うパッケージは、初回の実行で package-lock.json の版のとおりに利用者のキャッシュへ入れる（npm ci）。
// インストール時のスクリプトは動かさない。ロックファイルが変わると別の場所に入れ直す。
//
// 終了コード:
//   0 違反なし / 1 違反あり / 2 引数の誤り / 3 textlint か markdownlint を実行できなかった（パッケージの取得の失敗など）

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EVALUATORS_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(EVALUATORS_DIR, "..");
const RULES_DIR = join(SKILL_DIR, "rules");
const SCHEMAS_DIR = join(SKILL_DIR, "schemas");

// 機械判定のうち、実装していない部分。ルールIDは checked_rules にも含める
const PARTIAL_SKIPS = [{ rule_id: "NOT-006", reason: "表外の音訓は未実装（語の読みを決める形態素解析が要る）" }];

const EXIT_OK = 0;
const EXIT_VIOLATIONS = 1;
const EXIT_USAGE = 2;
const EXIT_TOOL_FAILURE = 3;

/** 引数を読む。 */
function parseArgs(argv) {
  const args = { file: null, type: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--type") {
      args.type = argv[i + 1];
      i += 1;
    } else if (argv[i] === "-h" || argv[i] === "--help") {
      args.help = true;
    } else if (!args.file) {
      args.file = argv[i];
    } else {
      args.error = `引数が多すぎる: ${argv[i]}`;
    }
  }
  return args;
}

/** コードブロックの中を除いた行を、行番号（1始まり）と組にして返す。 */
function linesOutsideCode(text) {
  const out = [];
  let fence = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      return;
    }
    if (!fence) out.push({ line, number: i + 1 });
  });
  return out;
}

/** 括弧の外にある「、」で区切る。ルール名に含まれる括弧（「句点(。)と読点(、)」）の中では区切らない。 */
function splitNames(text) {
  const names = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(" || ch === "（") depth += 1;
    if (ch === ")" || ch === "）") depth -= 1;
    if (ch === "、" && depth === 0) {
      names.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) names.push(current.trim());
  return names;
}

/**
 * rules/*.md の各ルールの見出しと「判定」欄を読み、判定手段からルールIDへの対応表を作る。
 * 「判定：機械（textlint：a、b）」は、textlint：a と textlint：b の両方を同じルールIDに対応させる。
 */
function loadRules() {
  const rules = new Map();
  const checkers = new Map();
  const files = readdirSync(RULES_DIR).filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "examples.md");
  for (const file of files.sort()) {
    let current = null;
    for (const { line } of linesOutsideCode(readFileSync(join(RULES_DIR, file), "utf8"))) {
      const heading = line.match(/^### ([A-Z]+-\d{3}) (.+)$/);
      if (heading) {
        current = { id: heading[1], summary: heading[2], judge: null, checkers: [] };
        rules.set(current.id, current);
        continue;
      }
      const judge = line.match(/^- 判定：(.+)$/);
      if (!judge || !current) continue;
      const value = judge[1].trim();
      const open = value.indexOf("（");
      current.judge = open < 0 ? value : value.slice(0, open);
      if (open < 0 || !value.endsWith("）")) continue;
      // 括弧の中は行末の「）」までを取る。ルール名に全角の括弧が入ることがあるため（NOT-025）
      let tool = null;
      for (const item of splitNames(value.slice(open + 1, -1))) {
        const m = item.match(/^(textlint|markdownlint)：(.+)$/);
        if (m) {
          tool = m[1];
        }
        const name = m ? m[2] : item;
        if (!tool) continue;
        const key = `${tool}：${name}`;
        current.checkers.push(key);
        if (!checkers.has(key)) checkers.set(key, []);
        checkers.get(key).push(current.id);
      }
    }
  }
  return { rules, checkers };
}

const SPAWN_OPTIONS = { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 };

/**
 * 採点で使うパッケージを入れる場所を返す。インストールの方法（手動配置、npx skills add、プラグイン）に関わらず、
 * 利用者のキャッシュに置く。環境変数 DOCS_RULES_CACHE_DIR で変えられる。
 */
function cacheRoot() {
  if (process.env.DOCS_RULES_CACHE_DIR) return resolve(process.env.DOCS_RULES_CACHE_DIR);
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "docs-rules");
  if (process.platform === "darwin") return join(homedir(), "Library", "Caches", "docs-rules");
  return join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "docs-rules");
}

/** npm を実行する。インストール時のスクリプトは環境変数でも止める。 */
function runNpm(args, cwd) {
  const options = { ...SPAWN_OPTIONS, cwd, env: { ...process.env, npm_config_ignore_scripts: "true" } };
  if (process.platform !== "win32") return spawnSync("npm", args, options);
  // npm.cmd はバッチファイルで、シェルを通さないと起動できない。Node.js に同梱の npm の本体があれば、それを直接起動する
  const cli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (existsSync(cli)) return spawnSync(process.execPath, [cli, ...args], options);
  // 引数は固定の文字列だけで、文書のパスなど利用者の入力を含まないため、シェルを通しても安全である
  return spawnSync("npm.cmd", args, { ...options, shell: true });
}

/**
 * package-lock.json の版のとおりにパッケージを入れ、入れた場所を返す。入れてあれば何もしない。
 * 場所の名前にロックファイルのハッシュを含め、ロックファイルが変わったら別の場所に入れ直す。
 * 一時的な場所に入れてから名前を変えるため、並行して呼ばれても、入れかけの場所を使わない。
 */
function ensurePackages() {
  const lock = readFileSync(join(EVALUATORS_DIR, "package-lock.json"));
  const hash = createHash("sha256").update(lock).digest("hex").slice(0, 16);
  const root = cacheRoot();
  const dir = join(root, `evaluators-${hash}`);
  if (existsSync(dir)) return dir;

  mkdirSync(root, { recursive: true });
  const work = mkdtempSync(join(root, `.installing-${hash}-`));
  try {
    copyFileSync(join(EVALUATORS_DIR, "package.json"), join(work, "package.json"));
    copyFileSync(join(EVALUATORS_DIR, "package-lock.json"), join(work, "package-lock.json"));
    const result = runNpm(["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error"], work);
    if (result.status !== 0) {
      throw new Error(`採点で使うパッケージを入れられなかった: ${(result.stderr || result.error?.message || "").trim().split("\n")[0]}`);
    }
    try {
      renameSync(work, dir);
    } catch (e) {
      // 別のプロセスが先に入れ終えていれば、そちらを使う
      if (!existsSync(dir)) throw e;
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  // 前のロックファイルで入れたものを消す
  for (const name of readdirSync(root)) {
    if (name.startsWith("evaluators-") && name !== basename(dir)) rmSync(join(root, name), { recursive: true, force: true });
  }
  return dir;
}

/** 入れたパッケージの、コマンドの本体のパスを返す。 */
function binPath(packagesDir, name) {
  const pkgDir = join(packagesDir, "node_modules", name);
  const { bin } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  return join(pkgDir, typeof bin === "string" ? bin : bin[name]);
}

/** パッケージのコマンドを Node.js で直接起動する。シェルを通さないため、文書のパスがコマンドとして解釈されない。 */
function runBin(packagesDir, name, args, cwd) {
  return spawnSync(process.execPath, [binPath(packagesDir, name), ...args], { ...SPAWN_OPTIONS, cwd });
}

/** 文書の行を取り出す。 */
function lineText(lines, number) {
  return lines[number - 1] ?? "";
}

/** textlint を実行し、結果を docs-rules の形に直す。 */
function runTextlint(file, source, lines, packagesDir, ruleIndex) {
  const args = [
    "--config",
    join(EVALUATORS_DIR, ".textlintrc.json"),
    "--rulesdir",
    join(EVALUATORS_DIR, "custom-rules"),
    "--format",
    "json",
    file,
  ];
  const result = runBin(packagesDir, "textlint", args, EVALUATORS_DIR);
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(`textlint を実行できなかった: ${(result.stderr || result.error?.message || "").trim().split("\n")[0]}`);
  }
  const violations = [];
  for (const message of parsed.flatMap((r) => r.messages)) {
    violations.push(toViolation(message, source, lines, ruleIndex));
  }
  return violations;
}

/** textlint のルールIDを、「判定」欄に書く名前に直す。 */
function textlintName(ruleId) {
  if (ruleId.startsWith("ja-technical-writing/")) return ruleId.slice("ja-technical-writing/".length);
  if (ruleId.startsWith("ja-spacing/")) return ruleId.slice("ja-spacing/".length);
  if (ruleId.startsWith("jtf-style/") || ruleId === "prh") return ruleId;
  // --rulesdir で読み込んだ自前のルール（custom-rules/<名前>.js）
  return `docs-rules/${ruleId}`;
}

/** textlint の1件の指摘を、採点結果の1件にする。 */
function toViolation(message, source, lines, ruleIndex) {
  const name = textlintName(message.ruleId);
  const checker = `textlint：${name}`;
  let ruleId = null;
  if (name === "prh") {
    // prh の辞書の項目には prh: <ルールID> を書いてあり、メッセージの最終行に出る
    const last = message.message.trim().split("\n").pop();
    ruleId = /^[A-Z]+-\d{3}$/.test(last) ? last : null;
  } else {
    const ids = ruleIndex.checkers.get(checker);
    ruleId = ids ? ids[0] : null;
  }
  let excerpt;
  let fix;
  let start;
  if (message.fix) {
    start = message.fix.range[0];
    excerpt = source.slice(message.fix.range[0], message.fix.range[1]);
    fix = `「${excerpt}」→「${message.fix.text}」`;
  } else {
    const [rangeStart, rangeEnd] = message.range ?? [message.index, message.index + 1];
    start = rangeStart;
    excerpt =
      rangeEnd - rangeStart > 1
        ? source.slice(rangeStart, rangeEnd)
        : lineText(lines, message.line).slice(message.column - 1, message.column + 19);
    const rule = ruleId ? ruleIndex.rules.get(ruleId) : null;
    // 直し方の候補がないときは、ルールの要約を直し方として返す。対応するルールがないときは、ツールのメッセージを返す
    fix = rule ? rule.summary : message.message.split("\n")[0];
  }
  // 該当箇所の桁（1始まり）。行の中で同じ文字列が複数あるときに、どれを指すかを区別する
  const column = start - source.lastIndexOf("\n", start - 1);
  return { rule_id: ruleId, line: message.line, column, excerpt, fix, judge: "機械", checker };
}

/** markdownlint-cli2 を実行し、結果を docs-rules の形に直す。 */
function runMarkdownlint(file, lines, packagesDir, ruleIndex) {
  const args = [
    "--config",
    join(EVALUATORS_DIR, ".markdownlint-cli2.jsonc"),
    // 「#」や「!」で始まる名前をグロブとして読ませないため、「:」を付けて文字どおりのパスとして渡す
    `:${basename(file)}`,
  ];
  const result = runBin(packagesDir, "markdownlint-cli2", args, dirname(file));
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`markdownlint-cli2 を実行できなかった: ${(result.stderr || result.error?.message || "").trim().split("\n")[0]}`);
  }
  const violations = [];
  for (const raw of (result.stderr || "").split("\n")) {
    const m = raw.match(/^.+?:(\d+)(?::(\d+))? (?:error|warning) (MD\d{3})\/\S+ (.+)$/);
    if (!m) continue;
    const [, lineNo, column, md, description] = m;
    const checker = `markdownlint：${md}`;
    const ids = ruleIndex.checkers.get(checker);
    const ruleId = ids ? ids[0] : null;
    const rule = ruleId ? ruleIndex.rules.get(ruleId) : null;
    const text = lineText(lines, Number(lineNo));
    violations.push({
      rule_id: ruleId,
      line: Number(lineNo),
      column: column ? Number(column) : 1,
      excerpt: column ? text.slice(Number(column) - 1, Number(column) + 19) : text.slice(0, 20),
      fix: rule ? rule.summary : description,
      judge: "機械",
      checker,
    });
  }
  return violations;
}

/**
 * schemas/<識別名>.md の必須セクション表と、文書の「##」見出しを順序込みで突き合わせる。
 * テンプレートの案内のコメント（<!-- -->）が出力に残っていないかも見る（SKILL.md の「3. 書く」）。
 */
function checkSchema(type, source) {
  const schemaPath = join(SCHEMAS_DIR, `${type}.md`);
  if (!existsSync(schemaPath)) return null;
  const required = [];
  for (const { line } of linesOutsideCode(readFileSync(schemaPath, "utf8"))) {
    const m = line.match(/^\| \d+ \| `(## [^`]+)` \|/);
    if (m) required.push(m[1]);
  }
  const headings = linesOutsideCode(source)
    .filter(({ line }) => /^## /.test(line))
    .map(({ line, number }) => ({ text: line.trim(), number }));
  const violations = [];
  for (const name of required) {
    if (!headings.some((h) => h.text === name)) {
      violations.push({
        rule_id: "SCHEMA",
        line: null,
        column: null,
        excerpt: name,
        fix: `必須セクション「${name}」を、schemas/${type}.md の表の順に置く`,
        judge: "機械",
        checker: "docs-rules/schema",
      });
    }
  }
  // 必須セクション同士の相対順序を見る。前の必須セクションより表で先に来るものを、順序の誤りとして返す
  let maxIndex = -1;
  for (const h of headings) {
    const index = required.indexOf(h.text);
    if (index < 0) continue;
    if (index < maxIndex) {
      violations.push({
        rule_id: "SCHEMA",
        line: h.number,
        column: 1,
        excerpt: h.text,
        fix: `「${h.text}」を「${required[maxIndex]}」より前に置く（schemas/${type}.md の表の順）`,
        judge: "機械",
        checker: "docs-rules/schema",
      });
    } else {
      maxIndex = index;
    }
  }
  for (const { line, number } of linesOutsideCode(source)) {
    const at = line.indexOf("<!--");
    // インラインコードの中の「<!--」（`<!-- -->` のような記法の説明）は除く
    if (at < 0 || line[at - 1] === "`") continue;
    violations.push({
      rule_id: "SCHEMA",
      line: number,
      column: at + 1,
      excerpt: line.slice(at).trim(),
      fix: "テンプレートの案内のコメントを消す",
      judge: "機械",
      checker: "docs-rules/schema",
    });
  }
  return violations;
}

/**
 * 同じルールIDで同じ箇所（行と桁）を指す違反を1件にまとめる。
 * 複数の判定手段が同じ箇所を指摘したとき（文末の「．」を ja-no-mixed-period と docs-rules/not-002 の両方が指摘するなど）、
 * 書き直しに同じ違反を2回渡さないため。直し方の候補（「A」→「B」）を返した方を残す。
 */
function mergeDuplicates(violations) {
  const kept = new Map();
  const out = [];
  for (const v of violations) {
    if (!v.rule_id || v.line === null) {
      out.push(v);
      continue;
    }
    const key = `${v.rule_id}:${v.line}:${v.column}`;
    const prev = kept.get(key);
    if (prev === undefined) {
      kept.set(key, out.length);
      out.push(v);
    } else if (!out[prev].fix.includes("」→「") && v.fix.includes("」→「")) {
      out[prev] = v;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file || args.error) {
    if (args.error) process.stderr.write(`${args.error}\n`);
    process.stderr.write("使い方: node score.mjs <文書のパス> [--type <識別名>]\n");
    return args.help ? EXIT_OK : EXIT_USAGE;
  }
  const file = resolve(args.file);
  if (!existsSync(file)) {
    process.stderr.write(`文書が見つからない: ${args.file}\n`);
    return EXIT_USAGE;
  }
  if (args.type && !existsSync(join(SCHEMAS_DIR, `${args.type}.md`))) {
    process.stderr.write(`schemas/ に ${args.type}.md がない\n`);
    return EXIT_USAGE;
  }
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  const ruleIndex = loadRules();

  let violations = [];
  try {
    const packagesDir = ensurePackages();
    violations = violations.concat(runTextlint(file, source, lines, packagesDir, ruleIndex));
    violations = violations.concat(runMarkdownlint(file, lines, packagesDir, ruleIndex));
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    return EXIT_TOOL_FAILURE;
  }

  // 機械判定のルールのうち、判定手段が「判定」欄に書いてあるものを、採点したルールとする
  const checked = [];
  const skipped = [...PARTIAL_SKIPS];
  for (const rule of ruleIndex.rules.values()) {
    if (rule.judge !== "機械") continue;
    if (rule.checkers.length > 0) checked.push(rule.id);
    else skipped.push({ rule_id: rule.id, reason: "「判定」欄に判定手段が書いていない" });
  }
  if (args.type) {
    checked.push("SCHEMA");
    violations = violations.concat(checkSchema(args.type, source));
  }
  checked.sort();
  violations = mergeDuplicates(violations);
  violations.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

  const result = {
    file: args.file,
    checked_rules: checked,
    skipped_rules: skipped,
    violations,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return violations.length > 0 ? EXIT_VIOLATIONS : EXIT_OK;
}

process.exitCode = main();
