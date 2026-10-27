// rules/ の各ルールが README.md の型を満たしているかを確かめる。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { linesOutsideCode, section, tableRows, splitOutsideParens, linkTarget } from "./lib/markdown.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RULES_DIR = join(ROOT, "skills/docs-rules/rules");
const README = join(RULES_DIR, "README.md");

// 1ルールの項目の名前と順序（rules/README.md の「1ルールの書き方」）
const ITEMS = ["ルール", "理由", "出典", "判定", "例"];

/** rules/README.md の「ファイルの分け方」の表から、ファイル名とIDのprefixの組を読む。 */
function filePrefixes() {
  return tableRows(section(README, "ファイルの分け方")).map(({ cells }) => {
    const prefix = cells[2].match(/^`([A-Z]+-)`$/);
    return { file: linkTarget(cells[0]), prefix: prefix ? prefix[1] : null };
  });
}

/** rules/README.md の略称の表から、出典に使える略称を読む。 */
function abbreviations() {
  return tableRows(section(README, "出典の書き方"))
    .filter(({ cells }) => cells.length === 3)
    .map(({ cells }) => cells[0]);
}

/** ルールのファイルを読み、ルールごとに見出しと項目を返す。 */
function readRules(file) {
  const rules = [];
  let current = null;
  for (const { text, number } of linesOutsideCode(join(RULES_DIR, file))) {
    const heading = text.match(/^### (\S+) (.+)$/);
    if (heading) {
      current = { id: heading[1], summary: heading[2], number, items: [], body: [], notes: [] };
      rules.push(current);
      continue;
    }
    if (/^#{1,2} /.test(text)) {
      current = null;
      continue;
    }
    if (!current) continue;
    // ルールの後ろに付く「>」の注記は、型の点検の対象外にする。注記の言い回しの点検のために別に集める
    if (text.startsWith(">")) {
      current.notes.push(text);
      continue;
    }
    if (text.trim() === "") continue;
    current.body.push(text);
    const item = text.match(/^- ([^：]+)：(.*)$/);
    if (item) current.items.push({ name: item[1], value: item[2] });
  }
  return rules;
}

/** 型を持つルールのファイル（IDのprefixがあるもの）の一覧。 */
function ruleFiles() {
  return filePrefixes().filter((f) => f.prefix);
}

test("rules: README.mdのファイルの表と、実際のファイルが一致する", () => {
  const listed = filePrefixes()
    .map((f) => f.file)
    .sort();
  const actual = readdirSync(RULES_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();
  assert.deepEqual(listed, actual, "rules/README.md の「ファイルの分け方」の表と rules/ のファイルが違う");
});

test("rules: 各ルールの項目が「ルール・理由・出典・判定・例」の順にそろう", () => {
  for (const { file } of ruleFiles()) {
    for (const rule of readRules(file)) {
      // 廃止したルールは、本文が「廃止（理由）」の1行になる
      if (rule.body.length === 1 && rule.body[0].startsWith("廃止")) continue;
      const names = rule.items.map((i) => i.name);
      assert.deepEqual(names, ITEMS, `${file}:${rule.number} ${rule.id} の項目が型と違う: ${names.join("・")}`);
    }
  }
});

test("rules: IDがファイルのprefixと3桁の番号で、全ファイルを通して重複しない", () => {
  const seen = new Map();
  for (const { file, prefix } of ruleFiles()) {
    for (const rule of readRules(file)) {
      assert.match(rule.id, new RegExp(`^${prefix}\\d{3}$`), `${file}:${rule.number} ${rule.id} のprefixか番号の形が違う`);
      assert.ok(!seen.has(rule.id), `${rule.id} が ${seen.get(rule.id)} と ${file} で重複している`);
      seen.set(rule.id, file);
    }
  }
  assert.ok(seen.size > 0, "ルールが1つも読めなかった");
});

test("rules: 判定の値が「機械」「AI」「人」のどれかで、併記の書式が正しい", () => {
  for (const { file } of ruleFiles()) {
    for (const rule of readRules(file)) {
      const item = rule.items.find((i) => i.name === "判定");
      if (!item) continue;
      const where = `${file}:${rule.id}`;
      const m = item.value.match(/^(機械|AI|人)(?:（(.+)）)?$/);
      assert.ok(m, `${where} の判定「${item.value}」が書式に合わない`);
      if (!m[2]) continue;
      assert.equal(m[1], "機械", `${where} の判定の併記は「機械」にだけ付ける`);
      // 括弧の中は「textlint：<名前>」「markdownlint：MD000」を「、」で並べる。ツール名は続く名前に掛かる
      let tool = null;
      for (const part of splitOutsideParens(m[2])) {
        const named = part.match(/^(textlint|markdownlint)：(.+)$/);
        if (named) tool = named[1];
        assert.ok(tool, `${where} の判定の併記がツール名で始まっていない: ${part}`);
        const name = named ? named[2] : part;
        assert.ok(!/^\s|\s$/.test(name) && name.length > 0, `${where} の判定の併記の名前が空か、前後にスペースがある`);
        if (tool === "markdownlint") assert.match(name, /^MD\d{3}$/, `${where} のmarkdownlintのルール名はMD番号で書く: ${name}`);
      }
    }
  }
});

test("rules: 出典の資料名が、README.mdの略称の表にある", () => {
  const names = abbreviations();
  assert.ok(names.length > 0, "略称の表が読めなかった");
  for (const { file } of ruleFiles()) {
    for (const rule of readRules(file)) {
      const item = rule.items.find((i) => i.name === "出典");
      if (!item) continue;
      for (const part of splitOutsideParens(item.value)) {
        assert.ok(
          names.some((n) => part.startsWith(n)),
          `${file}:${rule.id} の出典「${part}」が略称の表にない資料名で始まっている`
        );
      }
    }
  }
});

// 機械判定のルールのうち、AI評価に回す部分を示す注記の言い回し（rules/README.md の「機械で判定できない部分をAI評価に回す」）
const AI_PHRASE = "AI評価で扱う";
const EVALUATE = join(ROOT, "skills/docs-rules/prompts/evaluate.md");

test("rules: 注記でAI評価に触れるときは「AI評価で扱う」の言い回しを使う", () => {
  for (const { file } of ruleFiles()) {
    for (const rule of readRules(file)) {
      for (const note of rule.notes) {
        if (!note.includes("AI評価")) continue;
        assert.ok(note.includes(AI_PHRASE), `${file}:${rule.id} の注記が「${AI_PHRASE}」の言い回しを使っていない: ${note}`);
      }
    }
  }
});

// 機械で判定しない部分や、判定を先送りした部分を示す言い回し。
// 「見分けられない」は、指摘しすぎる側の説明（NOT-006の固有名詞）にも使うため含めない
const UNJUDGED = /判定しない|検出できない|実装時|別途決める|未実装/;

test("rules: 判定：機械のルールで機械が判定しない部分は、「AI評価で扱う」としてAI評価に回す", () => {
  for (const { file } of ruleFiles()) {
    for (const rule of readRules(file)) {
      const judge = rule.items.find((i) => i.name === "判定")?.value ?? "";
      if (!judge.startsWith("機械")) continue;
      for (const note of rule.notes) {
        if (!UNJUDGED.test(note)) continue;
        assert.ok(note.includes(AI_PHRASE), `${file}:${rule.id} の注記が、機械で判定しない部分をAI評価にも回していない: ${note}`);
      }
    }
  }
});

test("rules: 「AI評価で扱う」の注記があるルールと、判定：AIのルールが、評価の手順の対象に入る", () => {
  const evaluate = readFileSync(EVALUATE, "utf8");
  // evaluate.md は rules/README.md の表にあるファイルをすべて読み、判定：AI と注記の言い回しで対象を決める
  assert.ok(evaluate.includes("ファイルの分け方"), "prompts/evaluate.md が rules/README.md の「ファイルの分け方」の表を読む手順になっていない");
  assert.ok(evaluate.includes("`判定：AI`"), "prompts/evaluate.md が判定：AIのルールを対象にしていない");
  assert.ok(evaluate.includes(AI_PHRASE), `prompts/evaluate.md が注記の「${AI_PHRASE}」を対象にしていない`);
  const delegated = [];
  for (const { file } of ruleFiles()) {
    for (const rule of readRules(file)) {
      const judge = rule.items.find((i) => i.name === "判定")?.value ?? "";
      if (judge.startsWith("機械") && rule.notes.some((n) => n.includes(AI_PHRASE))) delegated.push(rule.id);
    }
  }
  // GRM-001（文末の混在）とGRM-002（論点の数）は、機械で判定できない部分をAI評価に回している
  for (const id of ["GRM-001", "GRM-002"]) {
    assert.ok(delegated.includes(id), `${id} の注記に「${AI_PHRASE}」がない`);
  }
});

test("rules: forbidden-words.mdの一覧表のIDと判定が、本文のルールと一致する", () => {
  const file = "forbidden-words.md";
  const listed = tableRows(section(join(RULES_DIR, file), "一覧")).map(({ cells }) => ({ id: cells[0], judge: cells[2] }));
  const body = readRules(file).map((rule) => {
    const judge = rule.items.find((i) => i.name === "判定")?.value ?? "";
    // 一覧表には括弧の中の併記を書かない
    return { id: rule.id, judge: judge.replace(/（.*）$/, "") };
  });
  assert.deepEqual(
    listed,
    body.sort((a, b) => a.id.localeCompare(b.id)),
    "forbidden-words.md の一覧表と本文のルールが一致しない"
  );
});
