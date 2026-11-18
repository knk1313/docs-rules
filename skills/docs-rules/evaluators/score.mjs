#!/usr/bin/env node
// docs-rules のルールベース採点の入口（#21）。
//
// 使い方（リポジトリの直下から）:
//   node skills/docs-rules/evaluators/score.mjs <文書のパス>...
//
// textlint と markdownlint-cli2 を呼び、結果を docs-rules のルールIDに直して JSON で返す。
// 文書を二つ以上渡すと、ツールの起動を1回にまとめて採点し、文書ごとの結果を配列で返す。
// Node.js の標準モジュールだけで書き、利用者に npm install を求めない。
//
// 採点で使うパッケージは、初回の実行で package-lock.json の版のとおりに利用者のキャッシュへ入れる（npm ci）。
// インストール時のスクリプトは動かさない。ロックファイルが変わると別の場所に入れ直す。
//
// 終了コード:
//   0 違反なし / 1 違反あり / 2 引数の誤り / 3 textlint か markdownlint を実行できなかった（パッケージの取得の失敗など）

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, utimesSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EVALUATORS_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(EVALUATORS_DIR, "..");
const RULES_DIR = join(SKILL_DIR, "rules");

// 使わなくなった版のキャッシュを消すまでの日数。並行して動く別の版のスキルが使っているものを消さないため、すぐには消さない
const CACHE_KEEP_DAYS = 7;

const EXIT_OK = 0;
const EXIT_VIOLATIONS = 1;
const EXIT_USAGE = 2;
const EXIT_TOOL_FAILURE = 3;

/** 引数を読む。誤りがあれば error に理由を入れる。 */
function parseArgs(argv) {
  const args = { files: [] };
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      args.help = true;
    } else if (arg.startsWith("-")) {
      args.error = `知らないオプション: ${arg}`;
      break;
    } else if (!args.files.includes(arg)) {
      args.files.push(arg);
    }
  }
  return args;
}

/**
 * コードブロックの中を除いた行を、行番号（1始まり）と組にして返す。
 * 囲み型（「```」「~~~」）と字下げ型（空行の後の4字以上の字下げ）の両方を除く。
 * 箇条書の続きの字下げは、字下げ型のコードブロックとして扱わない。
 */
function linesOutsideCode(text) {
  const out = [];
  let fence = null;
  let indented = false;
  let inList = false;
  let prevBlank = true;
  text.split(/\r?\n/).forEach((line, i) => {
    const blank = line.trim() === "";
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      prevBlank = false;
      return;
    }
    if (fence) return;
    const deep = /^( {4}|\t)/.test(line);
    if (!blank) {
      indented = deep && (indented || (prevBlank && !inList));
      if (/^\s*([-*+]|\d+[.)])\s/.test(line)) inList = true;
      else if (!deep && !/^\s/.test(line)) inList = false;
    }
    prevBlank = blank;
    if (!indented || blank) out.push({ line, number: i + 1 });
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
  const files = readdirSync(RULES_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
    .map((f) => join(RULES_DIR, f));
  for (const path of files) {
    let current = null;
    for (const { line } of linesOutsideCode(readFileSync(path, "utf8"))) {
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
      // 括弧の中は行末の「）」までを取る。ルール名に全角の括弧が入ることがあるため
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
 * 使うたびに場所の更新日時を今にし、使わなくなった版の場所を消す目安にする。
 */
function ensurePackages() {
  const lock = readFileSync(join(EVALUATORS_DIR, "package-lock.json"));
  const hash = createHash("sha256").update(lock).digest("hex").slice(0, 16);
  const root = cacheRoot();
  const dir = join(root, `evaluators-${hash}`);
  if (existsSync(dir)) {
    touch(dir);
    return dir;
  }

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

  touch(dir);
  // 別のロックファイルで入れたもののうち、CACHE_KEEP_DAYS 日より長く使っていないものを消す。
  // 別の版のスキルが並行して動いていると、その版の場所は使用中のため、すぐには消さない
  const limit = Date.now() - CACHE_KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const name of readdirSync(root)) {
    if (!name.startsWith("evaluators-") || name === basename(dir)) continue;
    const path = join(root, name);
    try {
      if (statSync(path).mtimeMs < limit) rmSync(path, { recursive: true, force: true });
    } catch {
      // 別のプロセスが先に消したときは何もしない
    }
  }
  return dir;
}

/** 場所の更新日時を今にする。更新できなくても採点は続ける。 */
function touch(path) {
  const now = new Date();
  try {
    utimesSync(path, now, now);
  } catch {
    // 読み取り専用のキャッシュなど、更新できない場所でも採点には差し支えない
  }
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

/** シンボリックリンクを解いた実際のパスを返す。macOS の /tmp と /private/tmp のように、同じ文書を別の名前で指すことがあるため。 */
function realPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

/**
 * textlint を1回だけ起動してすべての文書を採点し、結果を docs-rules の形に直して各文書の violations に足す。
 * textlint は起動のたびに辞書などを読み込むため、文書ごとに起動すると遅い。
 */
async function runTextlint(docs, packagesDir, ruleIndex) {
  const args = [
    "--config",
    join(EVALUATORS_DIR, "textlintrc.json"),
    "--rulesdir",
    join(EVALUATORS_DIR, "custom-rules"),
    "--format",
    "json",
    ...docs.map((doc) => doc.file),
  ];
  const result = runBin(packagesDir, "textlint", args, EVALUATORS_DIR);
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(`textlint を実行できなかった: ${(result.stderr || result.error?.message || "").trim().split("\n")[0]}`);
  }
  const byPath = new Map(docs.map((doc) => [realPath(doc.file), doc]));
  let tokenize = null;
  for (const r of parsed) {
    const doc = byPath.get(realPath(r.filePath));
    if (!doc) throw new Error(`textlint の結果の文書を見分けられなかった: ${r.filePath}`);
    for (const message of r.messages) {
      if (message.ruleId === DOUBLED_JOSHI) {
        // 形態素解析は、この指摘があるときだけ読み込む
        tokenize ??= createRequire(join(packagesDir, "package.json"))("kuromojin").tokenize;
        if (await crossesPredicate(tokenize, doc.source, message)) continue;
      }
      doc.violations.push(toViolation(message, doc.source, doc.lines, ruleIndex));
    }
  }
}

const DOUBLED_JOSHI = "ja-technical-writing/no-doubled-joshi";
const PREDICATE_POS = new Set(["動詞", "形容詞", "助動詞"]);

/**
 * no-doubled-joshi の指摘のうち、前の同じ助詞との間に述語（動詞、形容詞、助動詞）があるものを見分ける（#67）。
 * 「表示が崩れる不具合が見つかった」の二つの「が」は、別々の述語に掛かる自然な文のため、GRM-005 の違反にしない。
 * 前の助詞は、指摘の位置から文の頭（「。」「！」「？」か改行の後ろ）までの間で探す。続けて出る助詞は一つにまとめて比べる。
 * 形容動詞の語尾の「に」（「密接に関わる」）は助詞として数えない。
 */
async function crossesPredicate(tokenize, source, message) {
  const joshi = message.message.match(/助詞 "(.+?)" がみつかりました/)?.[1];
  const start = message.range?.[0] ?? message.index;
  if (!joshi || start === undefined) return false;
  let from = start;
  while (from > 0 && !"。！？\n".includes(source[from - 1])) from -= 1;
  const tokens = await tokenize(source.slice(from, start));
  // 指摘された「に」が形容動詞の語尾なら、助詞の連続ではない
  if (joshi === "に" && (await isAdjectivalNoun(tokenize, tokens.at(-1)))) return true;
  let predicateSeen = false;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i].pos === "助詞") {
      let k = i;
      while (k > 0 && tokens[k - 1].pos === "助詞") k -= 1;
      const matched = tokens.slice(k, i + 1).map((t) => t.surface_form).join("") === joshi;
      if (matched && !(joshi === "に" && (await isAdjectivalNoun(tokenize, tokens[k - 1])))) return predicateSeen;
      i = k;
    } else if (PREDICATE_POS.has(tokens[i].pos)) {
      predicateSeen = true;
    }
  }
  return false;
}

/**
 * 「に」の前の語が、形容動詞の語幹（「密接」「適切」）かを見る。
 * 文の中では「生活に密接に」の「密接」をサ変名詞と解析することがあるため、語に「に」を付けて単独で解析し直す。
 */
async function isAdjectivalNoun(tokenize, token) {
  if (!token || token.pos !== "名詞") return false;
  if (token.pos_detail_1 === "形容動詞語幹" || token.pos_detail_2 === "形容動詞語幹") return true;
  const alone = await tokenize(`${token.surface_form}に`);
  return alone.length === 2 && alone[1].pos_detail_1 === "副詞化";
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
    // ja-no-redundant-expressionはFW-001とFW-002の両方に当たる。「〜を行う」の辞書の指摘は、FW-002として返す
    if (name === "ja-no-redundant-expression" && /行う"は冗長/.test(message.message) && ids?.includes("FW-002")) ruleId = "FW-002";
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

/**
 * markdownlint-cli2 を実行し、結果を docs-rules の形に直して各文書の violations に足す。
 * 文書のあるディレクトリで、ファイル名だけを渡して起動する。同じディレクトリの文書は1回の起動にまとめる。
 */
function runMarkdownlint(docs, packagesDir, ruleIndex) {
  const byDir = new Map();
  for (const doc of docs) {
    const dir = dirname(doc.file);
    if (!byDir.has(dir)) byDir.set(dir, new Map());
    byDir.get(dir).set(basename(doc.file), doc);
  }
  for (const [dir, byName] of byDir) {
    const args = [
      "--config",
      join(EVALUATORS_DIR, "docs-rules.markdownlint-cli2.jsonc"),
      // 「#」や「!」で始まる名前をグロブとして読ませないため、「:」を付けて文字どおりのパスとして渡す
      ...[...byName.keys()].map((name) => `:${name}`),
    ];
    const result = runBin(packagesDir, "markdownlint-cli2", args, dir);
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`markdownlint-cli2 を実行できなかった: ${(result.stderr || result.error?.message || "").trim().split("\n")[0]}`);
    }
    for (const raw of (result.stderr || "").split("\n")) {
      const m = raw.match(/^(.+?):(\d+)(?::(\d+))? (?:error|warning) (MD\d{3})\/\S+ (.+)$/);
      if (!m) continue;
      const [, name, lineNo, column, md, description] = m;
      const doc = byName.get(name);
      if (!doc) throw new Error(`markdownlint-cli2 の結果の文書を見分けられなかった: ${name}`);
      const checker = `markdownlint：${md}`;
      const ids = ruleIndex.checkers.get(checker);
      const ruleId = ids ? ids[0] : null;
      const rule = ruleId ? ruleIndex.rules.get(ruleId) : null;
      const text = lineText(doc.lines, Number(lineNo));
      if (md === "MD034" && column && isExampleEmail(text, Number(column) - 1)) continue;
      doc.violations.push({
        rule_id: ruleId,
        line: Number(lineNo),
        column: column ? Number(column) : 1,
        excerpt: column ? text.slice(Number(column) - 1, Number(column) + 19) : text.slice(0, 20),
        fix: rule ? rule.summary : description,
        judge: "機械",
        checker,
      });
    }
  }
}

// 例示用に予約されたドメイン（RFC 2606、RFC 6761と、JPRSの予約）
const EXAMPLE_DOMAIN = /(?:^|\.)(?:example\.(?:com|net|org|jp)|[^.]+\.example)$/i;

/**
 * MD034（URLの直書き）の指摘のうち、書式の例として示したメールアドレスを見分ける（#90）。
 * かぎ括弧の中にあるものと、例示用のドメインのものは、リンクにする文字列ではないため MKD-010 の違反にしない。
 */
function isExampleEmail(text, index) {
  const m = text.slice(index).match(/^[^\s「」『』<>()（）]+@([^\s「」『』<>()（）]+?)(?=[\s「」『』<>()（）]|$)/);
  if (!m) return false;
  const before = text.slice(0, index);
  const inQuote = before.lastIndexOf("「") > before.lastIndexOf("」");
  return inQuote || EXAMPLE_DOMAIN.test(m[1]);
}

/**
 * 同じルールIDで同じ箇所（行と桁）を指す違反を1件にまとめる。
 * 複数の判定手段が同じ箇所を指摘したとき（文末の「．」を ja-no-mixed-period と docs-rules/not-002 の両方が指摘するなど）、
 * 同じ違反を2回数えないため。直し方の候補（「A」→「B」）を返した方を残す。
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.files.length === 0 || args.error) {
    if (args.error) process.stderr.write(`${args.error}\n`);
    process.stderr.write("使い方: node score.mjs <文書のパス>...\n");
    return args.help ? EXIT_OK : EXIT_USAGE;
  }
  const docs = [];
  for (const arg of args.files) {
    const file = resolve(arg);
    if (!existsSync(file)) {
      process.stderr.write(`文書が見つからない: ${arg}\n`);
      return EXIT_USAGE;
    }
    if (!statSync(file).isFile()) {
      process.stderr.write(`文書のパスがファイルではない: ${arg}\n`);
      return EXIT_USAGE;
    }
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch (e) {
      process.stderr.write(`文書を読めない: ${arg}（${e.code ?? e.message}）\n`);
      return EXIT_USAGE;
    }
    docs.push({ arg, file, source, lines: source.split(/\r?\n/), violations: [] });
  }
  const ruleIndex = loadRules();

  try {
    const packagesDir = ensurePackages();
    await runTextlint(docs, packagesDir, ruleIndex);
    runMarkdownlint(docs, packagesDir, ruleIndex);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    return EXIT_TOOL_FAILURE;
  }

  // 機械判定のルールのうち、判定手段が「判定」欄に書いてあるものを、採点したルールとする
  const checked = [];
  const skipped = [];
  for (const rule of ruleIndex.rules.values()) {
    if (rule.judge !== "機械") continue;
    if (rule.checkers.length === 0) {
      skipped.push({ rule_id: rule.id, reason: "「判定」欄に判定手段が書いていない" });
      continue;
    }
    checked.push(rule.id);
  }
  checked.sort();

  const results = docs.map((doc) => {
    const violations = mergeDuplicates(doc.violations);
    violations.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
    return {
      file: doc.arg,
      checked_rules: checked,
      skipped_rules: skipped,
      violations,
    };
  });
  // 文書が一つのときは、従来どおり結果のオブジェクトを一つ返す
  const output = results.length === 1 ? results[0] : results;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  return results.some((r) => r.violations.length > 0) ? EXIT_VIOLATIONS : EXIT_OK;
}

process.exitCode = await main();
