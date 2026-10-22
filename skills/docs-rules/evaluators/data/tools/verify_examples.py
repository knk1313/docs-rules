#!/usr/bin/env python3
"""手で起こした判定データの例語が、原文のPDFにすべて存在することを照合する。

使い方:
    python3 verify_examples.py <原文のPDF> <判定データのJSON>

前提:
    - poppler の pdftotext が PATH にあること

PDF の本文から空白と改行を取り除いた文字列を作り、JSON の中の例語
（word、base、standard、permitted、alt、reading、from の値）がその文字列に含まれるかを確かめる。
｟｠で示した置き換え部分（slot）は、語の前か後ろに付けた形で確かめる。
見つからない語があれば一覧を出し、終了コード1で終わる。
件数（meta.counts.examples）が例語の数と合わない場合も失敗にする。
"""

import json
import re
import subprocess
import sys
from pathlib import Path

CHECK_KEYS = ("word", "base", "standard", "alt", "reading", "from")


def pdf_text(pdf_path):
    """PDF の本文を、空白と改行を取り除いた1つの文字列にして返す。"""
    out = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    ).stdout.decode("utf-8")
    # ｟｠は置き換え部分の印で、語そのものには含まれない
    return re.sub(r"[\s｟｠]", "", out)


def collect(node, found):
    """JSON を再帰的にたどり、照合する語を (語, 置き換え部分) の組で集める。"""
    if isinstance(node, dict):
        slot = node.get("slot")
        for key in CHECK_KEYS:
            if key in node and isinstance(node[key], str):
                found.append((node[key], slot))
        if isinstance(node.get("permitted"), list):
            for s in node["permitted"]:
                found.append((s, None))
        for key, value in node.items():
            if key not in CHECK_KEYS and key != "permitted":
                collect(value, found)
    elif isinstance(node, list):
        for item in node:
            collect(item, found)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    pdf_path, json_path = Path(sys.argv[1]), Path(sys.argv[2])
    text = pdf_text(pdf_path)
    data = json.loads(json_path.read_text(encoding="utf-8"))
    words = []
    collect({k: v for k, v in data.items() if k != "meta"}, words)
    missing = []
    for word, slot in words:
        candidates = [word] if slot is None else [slot + word, word + slot]
        # 原文側は空白を取り除いてあるため、語の側の空白も取り除いて比べる
        candidates = [re.sub(r"\s", "", c) for c in candidates]
        if not any(c in text for c in candidates):
            missing.append(word if slot is None else f"{word}（{slot}）")
    print(f"照合: {json_path.name} 例語 {len(words)} 件")
    expected = data.get("meta", {}).get("counts", {}).get("examples")
    problems = []
    if missing:
        problems.append("原文に見つからない語: " + "、".join(missing))
    if expected != len(words):
        problems.append(f"meta.counts.examples は {expected} だが例語は {len(words)} 件")
    if problems:
        print("問題あり:")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print("問題なし")


if __name__ == "__main__":
    main()
