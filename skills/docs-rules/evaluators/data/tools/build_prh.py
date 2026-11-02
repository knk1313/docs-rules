#!/usr/bin/env python3
"""外来語の判定データ（JSON）から、textlint-rule-prh の辞書（YAML）を作る。

使い方:
    python3 skills/docs-rules/evaluators/data/tools/build_prh.py

gairaigo.json から NOT-011 の辞書を作り、evaluators/prh/gairaigo.yml に書き出す。
標準ライブラリだけで動く。同じ入力からは常に同じ出力になる（並び順を固定している）。

作った辞書のパターンが、判定データにある正しい語（用例集の語）に
当たってしまう場合は、そのパターンを辞書に入れずに一覧を出す。

送り仮名（NOT-010）の辞書は、#67で作るのをやめた。許容の形も通すと決め、
文書の中の混在を custom-rules/not-010.js で判定するようにしたため。
"""

import json
import re
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent
PRH_DIR = DATA_DIR.parent / "prh"

# 片仮名の文字クラス（パターンの前後の文字を見るのに使う）
KATAKANA = "ァ-ヺー"

# 片仮名の語幹がこの文字数より短いものは、ほかの語の一部に当たりやすいため辞書に入れない
MIN_GAIRAIGO_STEM = 3


def load(name):
    """判定データを読む。"""
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def yaml_quote(text):
    """YAML の二重引用符の文字列にする。"""
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def write_dict(path, header, entries):
    """prh の辞書を書き出す。entries は (expected, pattern, rule_id, specs) の並び。"""
    lines = [f"# {line}" if line else "#" for line in header]
    lines += ["version: 1", "rules:"]
    for expected, pattern, rule_id, specs in entries:
        lines.append(f"  - expected: {yaml_quote(expected)}")
        lines.append(f"    pattern: {yaml_quote('/' + pattern + '/')}")
        # prh の項目は、textlint のメッセージの末尾に付く。score.mjs はここからルールIDを読む
        lines.append(f"    prh: {rule_id}")
        lines.append("    specs:")
        for src, dst in specs:
            lines.append(f"      - from: {yaml_quote(src)}")
            lines.append(f"        to: {yaml_quote(dst)}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_gairaigo():
    """NOT-011 の辞書の項目を作る。"""
    data = load("gairaigo.json")
    examples = data["examples_list"]
    correct = {e["word"] for e in examples} | {e["alt"] for e in examples if "alt" in e}
    entries, skipped = [], []
    for ex in sorted(examples, key=lambda e: e["word"]):
        word = ex["word"]
        if not word.endswith("ー"):
            continue
        stem = word[:-1]
        # 告示が両様の書き方を認めている語（「コンピューター／コンピュータ」）は指摘しない
        if "alt" in ex:
            skipped.append((stem, "両様の書き方が認められている"))
            continue
        if len(stem) < MIN_GAIRAIGO_STEM:
            skipped.append((stem, f"{MIN_GAIRAIGO_STEM}字未満のため"))
            continue
        # 前後に片仮名が続くときは別の語の一部として扱い、指摘しない
        pattern = f"(?<![{KATAKANA}]){re.escape(stem)}(?![{KATAKANA}])"
        regex = re.compile(pattern)
        hits = sorted(w for w in correct if regex.search(w))
        if hits:
            skipped.append((stem, "正しい語に当たる: " + "、".join(hits)))
            continue
        entries.append((word, pattern, "NOT-011", [(stem, word)]))
    return entries, skipped


def main():
    PRH_DIR.mkdir(exist_ok=True)
    generated = "data/tools/build_prh.py で生成した。手で直さない"
    gai, gai_skipped = build_gairaigo()
    write_dict(
        PRH_DIR / "gairaigo.yml",
        [
            "NOT-011（外来語の語末の長音）の辞書。",
            f"{generated}（元データ: data/gairaigo.json の用例集）。",
            "",
            "用例集の語のうち語末が「ー」の語について、「ー」を省いた形を指摘する。",
            "両様の書き方が認められている語（alt のある語）は指摘しない。",
        ],
        gai,
    )
    print(f"gairaigo.yml: {len(gai)} 件（入れなかった語 {len(gai_skipped)} 件）")
    for word, reason in gai_skipped:
        print(f"  - {word}: {reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
