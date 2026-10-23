#!/usr/bin/env python3
"""常用漢字表（平成22年内閣告示第2号）のPDFから判定データ（JSON）を作る。

使い方:
    python3 build_joyo_kanji.py <常用漢字表のPDF> <出力先のJSON>

前提:
    - poppler の pdftotext が PATH にあること（単語ごとの座標を取り出すのに使う）
    - PDF は文化庁のサイトで配布している「常用漢字表（平成22年11月30日内閣告示）」の本表

PDF の本表は「漢字」「音訓」「例」「備考」の4列で組まれている。pdftotext の
-bbox-layout で単語ごとの x 座標を取り、列の位置で振り分ける。
1字下げで示された音訓（特別なもの、用法のごく狭いもの）は、音訓欄の x 座標が
通常より右に寄ることで見分け、special として記録する。
"""

import collections
import html
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

# 列の境界（pt）。本表の全ページで同じ版面のため固定値でよい
KANJI_MAX = 150  # 漢字欄（康熙字典体や許容字体の添え書きを含む）はこれより左
KANJI_SELF_MAX = 112  # 字種そのものはこれより左。添え書きはこれより右
READING_MAX = 240  # 音訓欄はこれより左
EXAMPLE_MAX = 390  # 例欄はこれより左。これ以上は備考欄
SPECIAL_READING_MIN = 178  # 音訓欄でこれより右から始まるものは1字下げ（特別な音訓）
HEADER_Y_MAX = 95  # ページ上部の索引（「ア－イ」など）はこれより上
INDEX_X_MIN = 500  # 索引はこれより右に置かれる（1ページ目は本文と同じ高さに出る）
INDEX_Y_MAX = 185  # 索引と「本表」の表題はこれより上
FOOTER_Y_MIN = 895  # ページ下部のフッターはこれより下
SAME_LINE = 4  # 同じ行とみなす y 座標の差

# 付表（2ページ）の列。左右2組の「読み」「語」の列がある
APPENDIX_COLUMNS = [(80, 150, 150, 300), (360, 430, 430, 600)]  # (読みの範囲, 語の範囲)
APPENDIX_FIRST_PAGE_Y_MIN = 190  # 付表の1ページ目は、表題と説明文がこれより上にある

WORD_RE = re.compile(
    r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>'
)
PAGE_RE = re.compile(r'<page width="[\d.]+" height="[\d.]+">(.*?)</page>', re.S)


def extract_pages(pdf_path):
    """pdftotext -bbox-layout を呼び、ページごとの単語（x, y, 文字列）の一覧を返す。"""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "bbox.html"
        subprocess.run(
            ["pdftotext", "-bbox-layout", str(pdf_path), str(out)],
            check=True,
            stderr=subprocess.DEVNULL,
        )
        text = out.read_text(encoding="utf-8")
    pages = []
    for page in PAGE_RE.findall(text):
        words = [
            (float(m.group(1)), float(m.group(2)), html.unescape(m.group(5)))
            for m in WORD_RE.finditer(page)
        ]
        pages.append(words)
    return pages


def group_lines(words):
    """単語を y 座標で行にまとめ、各行を x 順に並べて返す。"""
    lines = collections.defaultdict(list)
    for x, y, s in words:
        if y < HEADER_Y_MAX or y > FOOTER_Y_MIN or not s.strip():
            continue
        if y < INDEX_Y_MAX and (x >= INDEX_X_MIN or s in ("本", "表")):
            continue  # 索引と「本表」の表題
        key = None
        for k in lines:
            if abs(k - y) <= SAME_LINE:
                key = k
                break
        lines[key if key is not None else y].append((x, s))
    result = []
    for y in sorted(lines):
        # 句読点と開き括弧が同じ x に重なることがあり、その場合は句読点を先にする
        row = sorted(lines[y], key=lambda w: (round(w[0]), 0 if w[1] in "，。" else 1))
        result.append((y, row))
    return result


def join_words(words):
    """同じ列の単語を空白なしでつなぐ。"""
    return "".join(s for _, s in words)


def split_examples(text):
    """例欄の「，」区切りを分ける。"""
    return [w for w in re.split(r"[，,]", text) if w]


def parse_main_table(pages):
    """本表のページから漢字ごとの項目を組み立てる。"""
    entries = []
    current = None
    reading = None  # 直前の音訓の行。例や備考の続きの行をここに足す
    for words in pages:
        for y, row in group_lines(words):
            if join_words(row).startswith("漢字音訓例"):
                continue  # 1ページ目の列見出し
            kanji_words = [w for w in row if w[0] < KANJI_MAX]
            reading_words = [w for w in row if KANJI_MAX <= w[0] < READING_MAX]
            example_words = [w for w in row if READING_MAX <= w[0] < EXAMPLE_MAX]
            remark_words = [w for w in row if w[0] >= EXAMPLE_MAX]
            # 字種そのもの（漢字欄の左端）があれば新しい項目を始める
            self_words = [w for w in kanji_words if w[0] < KANJI_SELF_MAX]
            if self_words:
                current = {"kanji": self_words[0][1].strip(), "old_forms": [], "accepted_form": None, "readings": []}
                entries.append(current)
                reading = None
            # 漢字欄の添え書き: （康熙字典体）、［許容字体］、括弧なしで縦に並ぶ康熙字典体
            for x, s in kanji_words:
                if x < KANJI_SELF_MAX or current is None:
                    continue
                s = s.strip()
                m = re.fullmatch(r"（(.+)）", s)
                if m:
                    current["old_forms"].append(m.group(1))
                    continue
                m = re.fullmatch(r"［(.+)］", s)
                if m:
                    current["accepted_form"] = m.group(1)
                    continue
                if len(s) == 1:
                    current["old_forms"].append(s)
            if self_words:
                # 漢字と同じ行に備考があれば、項目全体の備考として持つ
                if remark_words:
                    current["note"] = join_words(remark_words)
                if example_words:
                    current.setdefault("note", "")
                    current["note"] = (current.get("note") or "") + join_words(example_words)
                continue
            if current is None:
                continue
            if reading_words:
                x = reading_words[0][0]
                text = join_words(reading_words)
                m = re.fullmatch(r"（(.+)）", text)
                if m:  # 康熙字典体が複数あるとき、2つ目以降は音訓欄の位置に並ぶ
                    current["old_forms"].append(m.group(1))
                    continue
                m = re.fullmatch(r"［(.+)］", text)
                if m:
                    current["accepted_form"] = m.group(1)
                    continue
                reading = {
                    "reading": text,
                    "kind": "on" if re.fullmatch(r"[ァ-ヶー]+", text) else "kun",
                    "special": x >= SPECIAL_READING_MIN,
                    "examples": split_examples(join_words(example_words)),
                    "remark": join_words(remark_words) or None,
                }
                current["readings"].append(reading)
                continue
            # 音訓のない行は、直前の音訓の例や備考の続き
            if reading is None:
                target = current
                if example_words or remark_words:
                    current["note"] = (current.get("note") or "") + join_words(example_words + remark_words)
                continue
            if example_words:
                reading["examples"].extend(split_examples(join_words(example_words)))
            if remark_words:
                reading["remark"] = (reading["remark"] or "") + join_words(remark_words)
    return entries


def parse_appendix(pages):
    """付表のページから、読みと語の組を集める。"""
    items = []
    for page_index, words in enumerate(pages):
        # 1ページ目は表題と説明文の下から。2ページ目以降は索引の下から
        y_min = APPENDIX_FIRST_PAGE_Y_MIN if page_index == 0 else HEADER_Y_MAX
        for r0, r1, w0, w1 in APPENDIX_COLUMNS:
            readings = [(y, s) for x, y, s in words if r0 <= x < r1 and y_min < y < FOOTER_Y_MIN]
            terms = [(y, s) for x, y, s in words if w0 <= x < w1 and y_min < y < FOOTER_Y_MIN]
            readings.sort()
            column_items = []
            for y, s in readings:
                if s.startswith("（") and column_items:
                    column_items[-1]["note"] = s  # 読みの下に添えられた注記
                    continue
                if not re.fullmatch(r"[ぁ-ゖー]+", s):
                    continue  # 付表の冒頭にある説明文
                items.append({"reading": s, "words": [], "_y": y})
                column_items.append(items[-1])
            for y, s in terms:
                nearest = min(column_items, key=lambda it: abs(it["_y"] - y))
                if abs(nearest["_y"] - y) <= 8:
                    nearest["words"].append(s)
    for it in items:
        del it["_y"]
    return items


def format_json(data):
    """meta は読みやすく段付けし、entries と appendix は1項目1行にして差分を読みやすくする。"""
    dump = lambda obj: json.dumps(obj, ensure_ascii=False)
    lines = ["{", '"meta": ' + json.dumps(data["meta"], ensure_ascii=False, indent=2) + ","]
    for key in ("entries", "appendix"):
        lines.append(f'"{key}": [')
        items = data[key]
        for i, item in enumerate(items):
            lines.append(dump(item) + ("," if i < len(items) - 1 else ""))
        lines.append("]" + ("," if key == "entries" else ""))
    lines.append("}")
    return "\n".join(lines) + "\n"


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    pdf_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    pages = extract_pages(pdf_path)
    # 本表は「本表」の見出しがあるページから、「付表」の見出しがあるページの手前まで
    texts = ["".join(s for _, _, s in p) for p in pages]
    main_start = next(i for i, t in enumerate(texts) if t.startswith("本表"))
    appendix_start = next(i for i, t in enumerate(texts) if t.startswith("付表"))
    entries = parse_main_table(pages[main_start:appendix_start])
    appendix = parse_appendix(pages[appendix_start:])

    problems = []
    if len(entries) != 2136:
        problems.append(f"字数が2136と一致しない: {len(entries)}")
    seen = collections.Counter(e["kanji"] for e in entries)
    dup = [k for k, n in seen.items() if n > 1]
    if dup:
        problems.append(f"重複する字: {dup}")
    no_reading = [e["kanji"] for e in entries if not e["readings"]]
    if no_reading:
        problems.append(f"音訓のない字: {no_reading}")
    empty_appendix = [a["reading"] for a in appendix if not a["words"]]
    if empty_appendix:
        problems.append(f"語のない付表の読み: {empty_appendix}")

    data = {
        "meta": {
            "title": "常用漢字表",
            "notification": "平成22年内閣告示第2号",
            "notified_on": "2010-11-30",
            "source_url": "https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/kanji/index.html",
            "source_file": "https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/pdf/joyokanjihyo_20101130.pdf",
            "copyright": "内閣告示のため著作権の目的とならない（著作権法第13条第1号）",
            "generated_by": "skills/docs-rules/evaluators/data/tools/build_joyo_kanji.py",
            "counts": {
                "kanji": len(entries),
                "readings": sum(len(e["readings"]) for e in entries),
                "appendix": len(appendix),
            },
            "fields": {
                "entries[].kanji": "字種（通用字体）",
                "entries[].old_forms": "丸括弧で添えられた康熙字典体。複数あれば並べ、ない場合は空の配列",
                "entries[].accepted_form": "角括弧で添えられた許容字体。ない場合は null",
                "entries[].note": "漢字の行に付いた備考。ない場合は省略",
                "entries[].readings[].reading": "音訓。字音は片仮名、字訓は平仮名",
                "entries[].readings[].kind": "on（字音）か kun（字訓）",
                "entries[].readings[].special": "1字下げで示された音訓（特別なもの、用法のごく狭いもの）なら true",
                "entries[].readings[].examples": "例欄の語",
                "entries[].readings[].remark": "備考欄の文。ない場合は null",
                "appendix[].reading": "付表の読み",
                "appendix[].words": "付表の語。同じ読みに複数の語があれば並べる",
                "appendix[].note": "読みの下に添えられた注記。ない場合は省略",
            },
        },
        "entries": entries,
        "appendix": appendix,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(format_json(data), encoding="utf-8")
    print(f"書き出し: {out_path} 字 {len(entries)} 音訓 {data['meta']['counts']['readings']} 付表 {len(appendix)}")
    if problems:
        print("検証で問題あり:")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print("検証: 問題なし")


if __name__ == "__main__":
    main()
