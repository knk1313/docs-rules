// schemas/ と templates/ の整合を確かめる。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { headings, section, tableRows, linkTarget, linesOutsideCode } from "./lib/markdown.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMAS_DIR = join(ROOT, "skills/docs-rules/schemas");
const TEMPLATES_DIR = join(ROOT, "skills/docs-rules/templates");

// 各種別のファイルの「##」見出し（schemas/README.md の「1種別の書き方」）
const SCHEMA_SECTIONS = ["目的と読み手", "入力", "必須セクション", "セクションごとの書き方", "文書全体の制約"];

/** schemas/README.md の表から、種別のファイルを読む。 */
function schemaFiles() {
  return tableRows(section(join(SCHEMAS_DIR, "README.md"), "ファイルの分け方")).map(({ cells }) => ({
    file: linkTarget(cells[0]),
    id: cells[2].replace(/`/g, ""),
  }));
}

/** 種別のファイルの必須セクション表から、見出し名を順に読む。 */
function requiredSections(file) {
  return tableRows(section(join(SCHEMAS_DIR, file), "必須セクション")).map(({ cells, number }) => {
    const m = cells[1].match(/^`## (.+)`$/);
    assert.ok(m, `schemas/${file}:${number} の見出し名「${cells[1]}」が「\`## 見出し\`」の形でない`);
    return m[1];
  });
}

test("schemas: README.mdの表と、実際のファイルが一致する", () => {
  const listed = schemaFiles()
    .map((s) => s.file)
    .sort();
  const actual = readdirSync(SCHEMAS_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();
  assert.deepEqual(listed, actual, "schemas/README.md の「ファイルの分け方」の表と schemas/ のファイルが違う");
  for (const s of schemaFiles()) assert.equal(s.file, `${s.id}.md`, `識別名 ${s.id} とファイル名 ${s.file} が合わない`);
});

test("schemas: 各種別の「##」見出しが「1種別の書き方」の順に並ぶ", () => {
  for (const { file } of schemaFiles()) {
    assert.deepEqual(headings(join(SCHEMAS_DIR, file), 2), SCHEMA_SECTIONS, `schemas/${file} の「##」見出しが型と違う`);
  }
});

test("schemas: 必須セクション表の「順」が1から連番になっている", () => {
  for (const { file } of schemaFiles()) {
    const order = tableRows(section(join(SCHEMAS_DIR, file), "必須セクション")).map(({ cells }) => Number(cells[0]));
    assert.ok(order.length > 0, `schemas/${file} の必須セクション表が読めなかった`);
    assert.deepEqual(
      order,
      order.map((_, i) => i + 1),
      `schemas/${file} の必須セクション表の「順」が連番でない`
    );
  }
});

test("schemas: 「セクションごとの書き方」の「###」見出しが、必須セクション表の順と一致する", () => {
  for (const { file } of schemaFiles()) {
    const subheadings = section(join(SCHEMAS_DIR, file), "セクションごとの書き方")
      .filter(({ text }) => text.startsWith("### "))
      .map(({ text }) => text.slice(4).trim());
    assert.deepEqual(subheadings, requiredSections(file), `schemas/${file} の「###」見出しが必須セクション表と違う`);
  }
});

test("templates: README.mdの表と、実際のファイル、対応するスキーマが一致する", () => {
  const rows = tableRows(section(join(TEMPLATES_DIR, "README.md"), "ファイルの分け方"));
  const listed = rows.map(({ cells }) => linkTarget(cells[0])).sort();
  const actual = readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();
  assert.deepEqual(listed, actual, "templates/README.md の「ファイルの分け方」の表と templates/ のファイルが違う");
  for (const { cells, number } of rows) {
    const schemaLink = linkTarget(cells[3]);
    assert.equal(schemaLink, `../schemas/${linkTarget(cells[0])}`, `templates/README.md:${number} の対応するスキーマのリンクが違う`);
    assert.ok(existsSync(resolve(TEMPLATES_DIR, schemaLink)), `templates/README.md:${number} のリンク先 ${schemaLink} がない`);
  }
});

test("templates: 「##」見出しが、スキーマの必須セクション表と順序込みで一致する", () => {
  for (const { file } of schemaFiles()) {
    const template = join(TEMPLATES_DIR, file);
    assert.ok(existsSync(template), `templates/${file} がない`);
    assert.deepEqual(headings(template, 2), requiredSections(file), `templates/${file} の「##」見出しが schemas/${file} の必須セクション表と違う`);
    assert.equal(
      linesOutsideCode(template).filter(({ text }) => text.startsWith("# ")).length,
      1,
      `templates/${file} の「#」見出しが1つでない`
    );
  }
});
