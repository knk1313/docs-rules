#!/usr/bin/env python3
"""送り仮名と外来語の判定データ（JSON）から、textlint-rule-prh の辞書（YAML）を作る。

使い方:
    python3 skills/docs-rules/evaluators/data/tools/build_prh.py

okurigana.json から NOT-010 の辞書を、gairaigo.json から NOT-011 の辞書を作り、
evaluators/prh/okurigana.yml と evaluators/prh/gairaigo.yml に書き出す。
標準ライブラリだけで動く。同じ入力からは常に同じ出力になる（並び順を固定している）。

作った辞書のパターンが、判定データにある正しい語（例語、本則の形、用例集の語）に
当たってしまう場合は、そのパターンを辞書に入れずに一覧を出す。
"""

import json
import re
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent
PRH_DIR = DATA_DIR.parent / "prh"

# 漢字と片仮名の文字クラス（パターンの前後の文字を見るのに使う）
KANJI = "一-龯々〆"
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


def okurigana_words(data):
    """送り仮名の付け方の判定データから、正しい形の語をすべて集める。"""
    words = set()

    def add_examples(examples):
        for ex in examples or []:
            if "base" in ex:
                words.add(ex["base"])
            if "slot" in ex:
                # ｟｠の付いた語は、｟｠の部分と合わせた形だけを正しい語として扱う（「売上高」「博多織」）。
                # ｟｠の位置はデータにないため、前と後ろの両方を足す
                words.add(ex["word"] + ex["slot"])
                words.add(ex["slot"] + ex["word"])
            else:
                words.add(ex["word"])

    for rule in data["rules"]:
        principle = rule.get("principle") or {}
        add_examples(principle.get("examples"))
        for group in principle.get("groups") or []:
            add_examples(group.get("examples"))
        for exc in rule.get("exceptions") or []:
            add_examples(exc.get("examples"))
        for pair in (rule.get("permitted") or {}).get("pairs") or []:
            words.add(pair["standard"])
    appendix = data.get("appendix") or {}
    for item in appendix.get("with_okurigana", []) + appendix.get("without_okurigana", []):
        words.add(item["word"])
    return words


def okurigana_pairs(data):
    """許容の形と本則の形の組を集める。付表の語の許容の形も含める。"""
    pairs = []
    for rule in data["rules"]:
        for pair in (rule.get("permitted") or {}).get("pairs") or []:
            for permitted in pair["permitted"]:
                pairs.append((permitted, pair["standard"]))
    for item in (data.get("appendix") or {}).get("with_okurigana", []):
        for permitted in item.get("permitted", []):
            pairs.append((permitted, item["word"]))
    return pairs


def build_okurigana():
    """NOT-010 の辞書の項目を作る。"""
    data = load("okurigana.json")
    correct = okurigana_words(data)
    pairs = okurigana_pairs(data)
    all_forms = {p for p, _ in pairs} | {s for _, s in pairs}
    entries, skipped = [], []
    for permitted, standard in sorted(set(pairs)):
        # 1字の形（「答」「問」など）は熟語の一部に当たるため辞書に入れない
        if len(permitted) < 2:
            skipped.append((permitted, "1字のため"))
            continue
        # この形で始まる、より長い形（「申込」に対する「申込み」「申込む」）の続きの字は除く
        nexts = sorted({f[len(permitted)] for f in all_forms if f != permitted and f.startswith(permitted)})
        lookahead = "".join(nexts)
        if re.match(f"[{KANJI}]", permitted[-1]):
            # 漢字で終わる形は、後ろに漢字が続く複合語（通則7の「申込書」など）を除く
            lookahead = KANJI + lookahead
        pattern = f"(?<![{KANJI}]){re.escape(permitted)}"
        if lookahead:
            pattern += f"(?![{lookahead}])"
        regex = re.compile(pattern)
        hits = sorted(w for w in correct if regex.search(w))
        if hits:
            skipped.append((permitted, "正しい語に当たる: " + "、".join(hits)))
            continue
        entries.append((standard, pattern, "NOT-010", [(permitted, standard)]))
    return entries, skipped


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
    oku, oku_skipped = build_okurigana()
    write_dict(
        PRH_DIR / "okurigana.yml",
        [
            "NOT-010（送り仮名）の辞書。",
            f"{generated}（元データ: data/okurigana.json の許容の形）。",
            "",
            "判定できるのは、告示の許容の形として挙がった語だけである。",
        ],
        oku,
    )
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
    print(f"okurigana.yml: {len(oku)} 件（入れなかった語 {len(oku_skipped)} 件）")
    for word, reason in oku_skipped:
        print(f"  - {word}: {reason}")
    print(f"gairaigo.yml: {len(gai)} 件（入れなかった語 {len(gai_skipped)} 件）")
    for word, reason in gai_skipped:
        print(f"  - {word}: {reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
