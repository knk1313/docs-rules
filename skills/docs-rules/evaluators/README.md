# evaluators/

`rules/`の`判定：機械`のルールをコードで判定するための設定とデータを置く。

| 置くもの | 内容 | 状態 |
| --- | --- | --- |
| [score.mjs](score.mjs) | 採点の入口。1コマンドで文書を渡し、違反の一覧をJSONで返す | 置いた（#21） |
| [package.json](package.json) | 採点で使うパッケージと版。`score.mjs`がこの版を`npx`に渡す | 置いた（#21） |
| [.textlintrc.json](.textlintrc.json) | textlintの設定 | 置いた（#21） |
| [prh/](prh/) | textlint-rule-prhの辞書 | 置いた（#21） |
| [custom-rules/](custom-rules/) | 自前のtextlintルール。`lib/`はその共通部分 | 置いた（#21） |
| [data/](data/README.md) | 内閣告示の判定データ（JSON） | 置いた（#11） |
| [.markdownlint-cli2.jsonc](.markdownlint-cli2.jsonc) | markdownlintの設定 | 置いた（#14） |

## 採点の入口

### 使い方

```bash
node skills/docs-rules/evaluators/score.mjs <文書のパス> [--type <識別名>]
```

- 前提：Node.js 18以上。`score.mjs`は標準モジュールだけで書いてあり、textlintとmarkdownlint-cli2は`npx`で取得して実行する。利用者に事前の`npm install`を求めない（#13の決定）
- 版：[package.json](package.json)の`dependencies`に固定した版を使う。版を上げるときは、この文書の表と`rules/`の`判定`欄を見直す
- `--type`：文書種別の識別名（`session-log`、`proposal`など）を渡すと、`schemas/<識別名>.md`の必須セクション表と文書の`##`見出しを順序込みで突き合わせる。渡さないときはこの照合を飛ばす
- 初回の実行は、パッケージの取得に20秒ほどかかる。2回目からは`npx`のキャッシュを使う

### 終了コード

| 終了コード | 意味 | 利用者への扱い |
| --- | --- | --- |
| 0 | 違反なし | そのまま出力してよい |
| 1 | 違反あり | `violations`を見て直す |
| 2 | 引数の誤り（文書がない、`schemas/`にない識別名） | 引数を直して実行し直す |
| 3 | textlintかmarkdownlint-cli2を実行できなかった（ネットワークがなく`npx`で取得できないなど） | 機械判定を飛ばし、そのことを利用者に伝えたうえで、SKILL.mdの自己点検に戻る |

Node.jsがない環境では`node`のコマンドが見つからない。この場合も終了コード3と同じく扱う。

### 採点結果の形式

標準出力にJSONを1つ返す。項目名は、AI評価（#23）の結果と同じにする。

```json
{
  "file": "session-log.md",
  "checked_rules": ["FW-001", "NOT-016", "SCHEMA"],
  "skipped_rules": [{ "rule_id": "NOT-006", "reason": "表外の音訓は未実装（語の読みを決める形態素解析が要る）" }],
  "violations": [
    {
      "rule_id": "NOT-016",
      "line": 12,
      "column": 2,
      "excerpt": "ヶ",
      "fix": "「ヶ」→「か」",
      "judge": "機械",
      "checker": "textlint：jtf-style/2.2.3.一部の助数詞の表記"
    }
  ]
}
```

| 項目 | 意味 |
| --- | --- |
| `checked_rules` | 採点したルールID。`rules/`の`判定：機械`のうち、`判定`欄に判定手段が書いてあるもの。`--type`を渡したときは`SCHEMA`を足す。ここにあって`violations`に出ないルールは合格である |
| `skipped_rules` | 採点しなかったルールと理由。一部だけ実装したルールも、実装していない部分をここに出す |
| `violations[].rule_id` | docs-rulesのルールID。必須セクションの照合は`SCHEMA`。対応するルールがない判定手段（`max-ten`など、docs-rulesにないルール）は`null` |
| `violations[].line` | 該当行（1始まり）。必須セクションの欠落は該当行がないため`null` |
| `violations[].column` | 該当箇所の桁（1始まり）。同じ行に同じ文字列が複数あるときに区別する。必須セクションの欠落は`null`（#22で足した） |
| `violations[].excerpt` | 該当箇所の文字列 |
| `violations[].fix` | 直し方。ツールが修正候補を返したときは`「A」→「B」`の形、返さないときは`rules/`の該当ルールの見出しの要約。対応するルールがないときはツールのメッセージ |
| `violations[].judge` | `機械`。AI評価の結果とまとめるときに区別する |
| `violations[].checker` | 判定手段。`rules/`の`判定`欄と同じ書き方（`textlint：<ルール名>`、`markdownlint：MD0xx`）。必須セクションの照合は`docs-rules/schema` |

- 判定手段とルールIDの対応は、実行のたびに`rules/*.md`の`判定`欄から作る。ルールを足すときに`score.mjs`を直す必要はない
- 1つの判定手段が複数のルールの`判定`欄に書いてあるときは、先に書いてあるルールのIDを返す。ja-no-redundant-expressionはFW-001とFW-002の両方に当たるが、`rule_id`は常にFW-001になる
- prh辞書の指摘は、辞書の項目の`prh`に書いたルールIDを返す

## textlint

方針は[docs/textlint-policy.md](../../../docs/textlint-policy.md)のとおり。policyが#21に回した点は、設定ファイルを置くときに次のように決めた。

| 項目 | 決めたこと |
| --- | --- |
| sentence-lengthの上限 | 出典に数値がないため、既定値の100字を暫定にする（GRM-002の注記） |
| no-mix-dearu-desumasu | 本文・見出し・箇条書の指定を空文字（自動判定）にする。空文字で動くことを確かめた |
| `1.1.1.本文`とno-mix-dearu-desumasu | 敬体と常体が混ざった文書で、同じ箇所を重ねて指摘した。`1.1.1.本文`を無効にし、GRM-001の`判定`欄から外した |
| `2.1.5.カタカナ`とno-hankaku-kana | 半角カナの例では`2.1.5.カタカナ`は何も指摘しなかった。重複がないため両方を有効のままにする |
| `3.1.2.全角文字どうし`とja-no-space-between-full-width | NOT-023の例（漢字と平仮名の間のスペース）を検出したのはja-no-space-between-full-widthだけだった。NOT-023の`判定`欄に足した |
| `3.3.かっこ類と隣接する文字の間のスペースの有無`とja-no-space-around-parentheses | NOT-024の例を検出したのはja-no-space-around-parenthesesだけだった。NOT-024の`判定`欄に足した |
| arabic-kanji-numbers | 「一つ」を「1つ」に直すよう指摘した。NOT-014（漢数字で書く）と食い違うため無効にする |
| `4.2.9.ダッシュ(-)` | 第4.0版で削除された項目のため無効にする |
| preset-jtf-styleの設定キー | パッケージの`rulesConfig`から確かめ、`.textlintrc.json`に書いた |

## prh辞書

| ファイル | ルール | 作り方 |
| --- | --- | --- |
| [prh/manual.yml](prh/manual.yml) | NOT-004、NOT-008、NOT-016、NOT-025 | 手で書く |
| [prh/okurigana.yml](prh/okurigana.yml) | NOT-010 | `data/okurigana.json`の許容の形から生成する |
| [prh/gairaigo.yml](prh/gairaigo.yml) | NOT-011 | `data/gairaigo.json`の用例集から生成する |

生成する辞書は、次のコマンドで作り直す。生成結果もリポジトリに置き、利用者の環境では生成しない。

```bash
python3 skills/docs-rules/evaluators/data/tools/build_prh.py
```

- NOT-010：告示の許容の形（「申込み」「行なう」など）を本則の形に直す。1字の形（「答」「問」）は熟語の一部に当たるため入れない。後ろに漢字が続く形（「申込書」）は、通則7の慣用の語として指摘しない
- NOT-011：用例集の語のうち語末が「ー」の語について、「ー」を省いた形を指摘する。両様の書き方が認められている語（「コンピューター／コンピュータ」）は指摘しない。語幹が3字未満の語（「スキー」「コピー」）は、ほかの語の一部に当たりやすいため入れない
- 生成した辞書のパターンが、判定データにある正しい語に当たる場合は辞書に入れない。スクリプトがその一覧を出す
- どちらも、判定できるのは判定データに例として挙がった語だけである

## 自前のルール

`custom-rules/`のファイルは、textlintの`--rulesdir`で読み込む。ルール名はファイル名に`docs-rules/`を付けたものになる。

| ルール | docs-rules | 判定すること |
| --- | --- | --- |
| [docs-rules/fw-008](custom-rules/fw-008.js) | FW-008 | 「〜せんとする」「〜べく」「〜べし」と、名詞を修飾しない「べき」。言い換えは文によるため、直し方の候補は返さない |
| [docs-rules/not-006](custom-rules/not-006.js) | NOT-006 | 常用漢字表の字種にない漢字。許容字体は表内として扱う |
| [docs-rules/not-012](custom-rules/not-012.js) | NOT-012 | 4桁以上で「,」のない算用数字と、「千」「百」を含む漢数字の数量（「千二百人」） |
| [docs-rules/not-013](custom-rules/not-013.js) | NOT-013 | 1万以上で「万」「億」「兆」を交ぜない数と、「千」「百」を単位にした数（「3千人」） |
| [docs-rules/mkd-010](custom-rules/mkd-010.js) | MKD-010 | リンクの文言の「こちら」「ここ」「リンク」など。prh辞書では本文のすべての語に当たるため、リンクの文言だけを見るルールにした |

- NOT-012とNOT-013は、英字や記号とつながった数（「ISO 8601」「v1.2.3」「2026-10-22」）と、「年」「号」「番」「版」「回」「目」「期」が後ろに続く数を対象にしない
- NOT-006の表外の音訓は実装していない。語の読みを決めるには形態素解析が要り、利用者に追加のインストールを求めることになるため。採点結果では`skipped_rules`に出す。固有名詞もルールの対象外だが、文から見分けられないため指摘に含まれる

## markdownlint

Markdown記法のルール（[rules/markup.md](../rules/markup.md)）は、markdownlint-cli2で判定する。方針はtextlint（[docs/textlint-policy.md](../../../docs/textlint-policy.md)）と同じで、依存パッケージとして使い、判定条件を写して自前で書くことはしない。

### 実行方法

- 前提：Node.js。`npx`で実行し、利用者に事前の`npm install`を求めない（#13の決定と同じ）
- 版：markdownlint-cli2の0.24.0に固定する。版を上げるときは、下の表とrules/markup.mdの`判定`欄を見直す
- Node.jsがない環境、初回の`npx`でパッケージを取得できない環境の扱いは、上の「終了コード」のとおり、そのことを伝えたうえでSKILL.mdの自己点検に戻る

リポジトリの直下で、リポジトリ全体のMarkdownに当てるコマンドは次のとおり。利用者の文書に当てるときは、最後の引数を文書のパスにする。

```bash
npx -y markdownlint-cli2@0.24.0 --config skills/docs-rules/evaluators/.markdownlint-cli2.jsonc "**/*.md"
```

指摘が0件なら何も表示されず、終了コードが0になる。`score.mjs`は同じ設定でmarkdownlint-cli2を呼び、`checker`を`markdownlint：MD0xx`として採点結果にまとめる。

### 設定の方針

既定で有効な全ルールを土台にし、docs-rulesの基準に合わせて設定を変える。無効にするのはMD013だけで、ほかは有効のままにする。`.github/`のテンプレートは対象外にする（#27でtextlintの対象からも外している）。

| ルール | docs-rules | 扱い |
| --- | --- | --- |
| MD001、MD003 | MKD-001 | MD003の`style`を`atx`にする |
| MD025、MD041 | MKD-002 | 有効 |
| MD018、MD019、MD022、MD023 | MKD-003 | 有効 |
| MD004 | MKD-004 | `style`を`dash`にする |
| MD029 | MKD-005 | `style`を`ordered`にする |
| MD005、MD007、MD030 | MKD-006 | 有効 |
| MD031、MD032、MD058 | MKD-007 | 有効 |
| MD040、MD046、MD048 | MKD-008 | MD046の`style`を`fenced`、MD048の`style`を`backtick`にする |
| MD036、MD049、MD050 | MKD-009 | MD049とMD050の`style`を`asterisk`にする |
| MD034、MD042、MD059 | MKD-010 | 有効。MD059の`prohibited_texts`に日本語の語を足すと日本語の文言がすべて指摘されるため（0.24.0で確認）、既定の英語の語のままにし、「こちら」のような日本語の語は#21のprh辞書で判定する |
| MD045 | MKD-011 | 有効 |
| MD033 | MKD-012 | 有効 |
| MD009、MD010、MD012、MD047 | MKD-013 | MD009の`br_spaces`を`0`にし、強制改行のスペース2つも許さない |
| MD055、MD056 | MKD-014 | MD055の`style`を`leading_and_trailing`にする |
| MD026 | GRM-015 | 有効。見出し末尾の句点を判定する |
| MD013 | なし | 無効。日本語の文は1行が長く、折り返す運用をしていない |
| MD011、MD014、MD024、MD027、MD028、MD035、MD037、MD038、MD039、MD044、MD051、MD052、MD053、MD054、MD060 | なし | 有効のまま。リポジトリの書き方と食い違わない。`rules/`にルールとして足すかは別のIssueで決める |
| MD043 | なし | 既定のまま。見出しの一覧を設定に直書きする必要があり、`schemas/`を正本にできない。下の「見出し階層と必須セクションの判定」を参照 |

### 見出し階層と必須セクションの判定

- 見出し階層（1段ずつ下げる、見出し1は1つ、先頭は見出し1）は、標準のMD001・MD025・MD041で判定できる
- `schemas/`の必須セクション表との照合は、markdownlintの標準ルールではできない。MD043は見出しの一覧を設定ファイルに書く方式のため、`schemas/`を正本にできない。カスタムルールでも書けるが、#21で`score.mjs`が文書種別を受け取り、`schemas/<種別>.md`の表と文書の見出しを突き合わせると決めたため、markdownlint側では実装しない
