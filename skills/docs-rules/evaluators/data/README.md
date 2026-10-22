# evaluators/data/

内閣告示を、`evaluators/`のコードから読める判定データ（JSON）にして置く。告示は著作権の目的とならない（著作権法第13条第1号）ため、表そのものをデータとして置く。

## ファイルの一覧

| ファイル | 告示 | 告示番号 | 状態 |
| --- | --- | --- | --- |
| [joyo-kanji.json](joyo-kanji.json) | 常用漢字表 | 平成22年内閣告示第2号（平成22年11月30日） | 置いた |
| okurigana.json | 送り仮名の付け方 | 昭和48年内閣告示第2号（平成22年改正） | #11で置く |
| gairaigo.json | 外来語の表記 | 平成3年内閣告示第2号 | #11で置く |

## 共通の形

各ファイルは`meta`と本体から成る。`meta`はファイルを単体で切り出しても出典が分かるように、次の項目を持つ。

| 項目 | 意味 |
| --- | --- |
| `title` | 告示の名前 |
| `notification` | 告示番号 |
| `notified_on` | 告示の年月日（ISO 8601） |
| `source_url` | 文化庁の案内ページ |
| `source_file` | 変換の元にしたPDF |
| `copyright` | 著作権法第13条の対象である旨 |
| `generated_by` | データを作ったスクリプト |
| `counts` | 本体の件数。原本と照合した値 |
| `fields` | 本体の各項目の意味 |

本体は1項目1行で書き、差分を読みやすくする。項目の意味は各ファイルの`meta.fields`に書く。

## joyo-kanji.json

常用漢字表の本表（2136字）と付表（116語）を持つ。

- `entries`：本表。字種ごとに、康熙字典体（`old_forms`）、許容字体（`accepted_form`）、音訓の一覧（`readings`）を持つ
- `entries[].readings[]`：音訓ごとに、字音か字訓か（`kind`）、1字下げで示された特別な音訓か（`special`）、例欄の語（`examples`）、備考欄の文（`remark`）を持つ
- `appendix`：付表。読み（`reading`）と語（`words`）の組。同じ読みに複数の語がある場合（「かわら」の「河原」「川原」など）は並べる

表外の読みを判定できるよう、字の一覧だけでなく音訓まで持つ。判定の仕方は`evaluators/`の採点の入口（#21）で決める。

## 作り直し方

スクリプトは文化庁のPDFを引数に取り、JSONを書き出す。PDFとその文字起こしはリポジトリに置かない。

```bash
python3 skills/docs-rules/evaluators/data/tools/build_joyo_kanji.py <常用漢字表のPDF> skills/docs-rules/evaluators/data/joyo-kanji.json
```

- 前提：popplerの`pdftotext`がPATHにあること。Pythonは標準ライブラリだけを使う
- スクリプトは、字数が告示の2136字と一致すること、字の重複がないこと、音訓のない字がないことを確かめ、合わなければ失敗する
- PDFは`meta.source_file`のURLから取る

## 検証

```bash
python3 skills/docs-rules/evaluators/data/tools/check_data.py
```

このディレクトリのJSONがすべて読め、`meta`の必須項目がそろい、`counts`が本体の件数と一致することを確かめる。
