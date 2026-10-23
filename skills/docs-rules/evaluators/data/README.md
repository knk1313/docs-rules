# evaluators/data/

内閣告示を、`evaluators/`のコードから読める判定データ（JSON）にして置く。告示は著作権の目的とならない（著作権法第13条第1号）ため、表そのものをデータとして置く。

## ファイルの一覧

このディレクトリに置く判定データと、元にした告示は次のとおり。

| ファイル | 告示 | 告示番号 | 状態 |
| --- | --- | --- | --- |
| [joyo-kanji.json](joyo-kanji.json) | 常用漢字表 | 平成22年内閣告示第2号（平成22年11月30日） | 置いた |
| [okurigana.json](okurigana.json) | 送り仮名の付け方 | 昭和48年内閣告示第2号（昭和56年・平成22年一部改正） | 置いた |
| [gairaigo.json](gairaigo.json) | 外来語の表記 | 平成3年内閣告示第2号 | 置いた |

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
| `generated_by` | データの作り方。スクリプトで作ったものはそのパス、手で起こしたものは照合の方法 |
| `counts` | 本体の件数。原本と照合した値 |
| `fields` | 本体の各項目の意味 |

本体は1項目1行で書き、差分を読みやすくする。項目の意味は各ファイルの`meta.fields`に書く。

## joyo-kanji.json

常用漢字表の本表（2,136字）と付表（116語）を持つ。

- `entries`：本表。字種ごとに、旧字体（`old_forms`。常用漢字表が括弧の中に示す字体）、許容字体（`accepted_form`）、音訓の一覧（`readings`）を持つ
- `entries[].readings[]`：音訓ごとの項目。字音と字訓の区別（`kind`）、1字下げで示された特別な音訓かどうか（`special`）を持つ。例欄の語（`examples`）と備考欄の文（`remark`）も持つ
- `appendix`：付表。読み（`reading`）と語（`words`）の組。同じ読みに複数の語がある場合（「かわら」の「河原」「川原」など）は並べる

表外の読みを判定できるよう、字の一覧だけでなく音訓まで持つ。判定の仕方は`evaluators/`の採点の入口（#21）で決める。

## okurigana.json

送り仮名の付け方の通則1〜7と付表の語を持つ。告示は表ではなく規則の文章のため、各通則の本則・例外・許容の原文（`text`）と例語（`examples`）を持つ。判定できるのは例語に挙がった語の揺れだけで、形態素解析は範囲外とする。

- `rules[]`：通則。`principle`（本則）、`exceptions`（例外）、`permitted`（許容）、`notes`（注意）
- `rules[].permitted.pairs[]`：本則の形（`standard`）と、省いてよい形（`permitted`）の組。「売り上げ（売上げ・売上）」のように複数あれば並べる
- `examples[].base`：通則2・5で〔〕に示された、含まれている語。`slot`は通則7で｟｠に示された、他の漢字で置き換えてよい部分
- `appendix`：付表の語のうち送り仮名の付け方が問題となる語

## gairaigo.json

外来語の表記の第1表・第2表の仮名、留意事項その1・その2、付録の用例集を持つ。

- `table1`、`table2`：仮名の一覧。第1表は一般的な仮名（`basic`）と外来音に対応する仮名（`extended`）に分けた
- `general_notes[]`：留意事項その1（原則的な事項）。語形の揺れを決めない旨など
- `detailed_notes[]`：留意事項その2（細則的な事項）。仮名ごとの用法と例語、「一般的には〜と書くことができる」の注と例語
- `examples_list[]`：用例集。「バイオリン／ヴァイオリン」のように両様の書き方があるものは`alt`に持つ。語形は一例であり、他の書き方を否定しない

## 作り直し方

PDFとその文字起こしはリポジトリに置かない。PDFは各ファイルの`meta.source_file`のURLから取る。

### joyo-kanji.jsonはスクリプトで作る

スクリプトが文化庁のPDFを引数に取り、JSONを書き出す。

```bash
python3 skills/docs-rules/evaluators/data/tools/build_joyo_kanji.py <常用漢字表のPDF> skills/docs-rules/evaluators/data/joyo-kanji.json
```

- 前提：popplerの`pdftotext`がPATHにあること。Pythonは標準ライブラリだけを使う
- スクリプトは、字数が告示の2,136字と一致すること、字の重複がないこと、音訓のない字がないことを確かめ、合わなければ失敗する

### okurigana.jsonとgairaigo.jsonは手で起こして照合する

規則の文章が主体で表の形をしていないため、原文を読んで手で起こした。起こした例語が原文にあることは、次のスクリプトで照合する。

```bash
python3 skills/docs-rules/evaluators/data/tools/verify_examples.py <原文のPDF> skills/docs-rules/evaluators/data/okurigana.json
```

- PDFの本文から空白を取り除いた文字列に、JSONの例語（`word`、`base`、`standard`、`permitted`、`alt`、`reading`、`from`）がすべて含まれることを確かめる
- `meta.counts.examples`が例語の数と一致することも確かめる
- 例語を直したときは、このスクリプトを通してからコミットする

### prh辞書を作り直す

okurigana.jsonとgairaigo.jsonを直したときは、次のスクリプトでprh辞書を作り直す。出力先は`evaluators/prh/okurigana.yml`と`evaluators/prh/gairaigo.yml`である。辞書の作り方は[evaluators/README.md](../README.md)の「prh辞書」を参照。

```bash
python3 skills/docs-rules/evaluators/data/tools/build_prh.py
```

## 検証

```bash
python3 skills/docs-rules/evaluators/data/tools/check_data.py
```

このディレクトリのJSONがすべて読め、`meta`の必須項目がそろい、`counts`が本体の件数と一致することを確かめる。
