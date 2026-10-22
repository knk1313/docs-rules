#!/usr/bin/env python3
"""evaluators/data/ のJSONが読めることと、meta の必須項目と件数がそろっていることを確かめる。

使い方:
    python3 skills/docs-rules/evaluators/data/tools/check_data.py

標準ライブラリだけで動く。問題があれば一覧を出して終了コード1で終わる。
"""

import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent
REQUIRED_META = (
    "title",
    "notification",
    "notified_on",
    "source_url",
    "source_file",
    "copyright",
    "generated_by",
    "counts",
    "fields",
)


def check_file(path):
    """1ファイルを確かめ、問題の一覧を返す。"""
    problems = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        return [f"{path.name}: JSONとして読めない: {e}"]
    meta = data.get("meta")
    if not isinstance(meta, dict):
        return [f"{path.name}: meta がない"]
    for key in REQUIRED_META:
        if key not in meta:
            problems.append(f"{path.name}: meta.{key} がない")
    counts = meta.get("counts", {})
    # counts の各項目は、本体の同名の配列の長さか、入れ子の件数と一致する
    expected = {
        "kanji": len(data.get("entries", [])),
        "readings": sum(len(e.get("readings", [])) for e in data.get("entries", [])),
        "appendix": len(data.get("appendix", [])),
    }
    for key, value in counts.items():
        if key in expected and expected[key] != value:
            problems.append(f"{path.name}: counts.{key} は {value} だが本体は {expected[key]}")
    return problems


def main():
    files = sorted(DATA_DIR.glob("*.json"))
    if not files:
        sys.exit(f"{DATA_DIR} にJSONがない")
    problems = []
    for path in files:
        problems.extend(check_file(path))
        print(f"確認: {path.name}")
    if problems:
        print("問題あり:")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print("問題なし")


if __name__ == "__main__":
    main()
