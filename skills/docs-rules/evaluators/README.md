# evaluators/

`rules/`のルールを機械で検査するための入口と設定を置く。

| 置くもの | 内容 |
| --- | --- |
| [score.mjs](score.mjs) | 検査の入口。文書を渡すと、違反の一覧をJSONで返す |
| [package.json](package.json)、[package-lock.json](package-lock.json) | 検査で使うパッケージと版。`score.mjs`はロックファイルの版のとおりにパッケージを入れる |
| [textlintrc.json](textlintrc.json) | textlintの設定 |
| [prh/manual.yml](prh/manual.yml) | textlint-rule-prhの辞書（FW-002の「〜を行う」「〜を実施する」） |
| [custom-rules/](custom-rules/) | 自前のtextlintルール |
| [docs-rules.markdownlint-cli2.jsonc](docs-rules.markdownlint-cli2.jsonc) | markdownlintの設定 |

設定ファイルの名前は「.」で始めない。スキルをzipでアップロードする経路などで「.」で始まるファイルが落ちるため。`score.mjs`は`--config`で設定ファイルのパスを渡す。

## 使い方

```bash
node skills/docs-rules/evaluators/score.mjs <文書のパス>...
```

- 前提：Node.js 18以上とnpm。`score.mjs`は標準モジュールだけで書いてあり、利用者に事前の`npm install`を求めない
- 文書を二つ以上渡すと、ツールの起動を1回にまとめて検査し、文書ごとの結果を配列で返す

### パッケージの入れ方

textlintとmarkdownlint-cli2は、初回の実行で`score.mjs`が自分で入れる。

- 版：[package-lock.json](package-lock.json)のとおりに`npm ci`で入れる。インストール時のスクリプトは動かさない（`--ignore-scripts`）
- 入れる場所：利用者のキャッシュ。環境変数`DOCS_RULES_CACHE_DIR`で変えられる
  - macOS：`~/Library/Caches/docs-rules`
  - Linux：`~/.cache/docs-rules`。`XDG_CACHE_HOME`があればその下
  - Windows：`%LOCALAPPDATA%\docs-rules`
- 場所の名前にロックファイルのハッシュを含め、ロックファイルが変わると別の場所に入れる。7日より長く使っていない前の版の場所は消す
- 初回の実行は、パッケージの取得に数秒から20秒ほどかかる

### 終了コード

| 終了コード | 意味 |
| --- | --- |
| 0 | 違反なし |
| 1 | 違反あり（文書が二つ以上なら、どれかに違反がある） |
| 2 | 引数の誤り（文書がない、文書のパスがファイルでない、文書を読めない、知らないオプション） |
| 3 | textlintかmarkdownlint-cli2を実行できなかった（ネットワークがなくパッケージを入れられない、npmがないなど） |

### 出力の形式

```json
{
  "file": "notes.md",
  "checked_rules": ["FW-001", "NOT-022"],
  "skipped_rules": [],
  "violations": [
    {
      "rule_id": "NOT-022",
      "line": 3,
      "column": 7,
      "excerpt": " ",
      "fix": "全角文字と半角文字の間にスペースを入れない",
      "judge": "機械",
      "checker": "textlint：ja-space-between-half-and-full-width"
    }
  ]
}
```

| 項目 | 意味 |
| --- | --- |
| `checked_rules` | 検査したルールID。ここにあって`violations`に出ないルールは合格である |
| `skipped_rules` | 「判定」欄に判定手段が書いていないため検査しなかったルール |
| `violations[].rule_id` | ルールID。対応するルールがない判定手段の指摘は`null` |
| `violations[].line`、`column` | 該当箇所の行と桁（1始まり） |
| `violations[].excerpt` | 該当箇所の文字列 |
| `violations[].fix` | 直し方。ツールが修正候補を返したときは`「A」→「B」`の形、返さないときはルールの見出しの要約 |
| `violations[].checker` | 判定手段（`textlint：<ルール名>`、`markdownlint：MD0xx`） |

- 判定手段とルールIDの対応は、実行のたびに`rules/*.md`の「判定」欄から作る。ルールを足すときに`score.mjs`を直す必要はない
- ja-no-redundant-expressionはFW-001とFW-002の両方に当たるため、「〜を行う」の指摘は`FW-002`、それ以外は`FW-001`で返す
- 複数の判定手段が、同じルールIDで同じ箇所を指摘したときは1件にまとめる
- no-doubled-joshiの指摘のうち、前の同じ助詞との間に述語があるもの（「表示が崩れる不具合が見つかった」）は外す
- MD034の指摘のうち、かぎ括弧の中と例示用のドメイン（`example.com`など）のメールアドレスは外す

## textlint

3プリセット（preset-ja-technical-writing、preset-jtf-style、preset-ja-spacing）を使い、`rules/`に残したルールに対応する項目だけを有効にする。どの項目がどのルールに当たるかは、各ルールの「判定」欄に書く。ルールを足すときは、`textlintrc.json`で対応する項目を有効にし、「判定」欄に書く。

自前のルールは`custom-rules/`に置き、textlintの`--rulesdir`で読み込む。ルール名はファイル名に`docs-rules/`を付けたものになる。

| ルール | docs-rules | 判定すること |
| --- | --- | --- |
| [docs-rules/grm-001](custom-rules/grm-001.js) | GRM-001 | 本文の文末を常体と敬体に分けて数え、少ない方の文末。見出し、箇条書、表、引用の中は見ない |
| [docs-rules/grm-006](custom-rules/grm-006.js) | GRM-006 | no-double-negative-jaが拾わない「〜ないとは言えない」「〜ないとも限らない」 |
| [docs-rules/not-002](custom-rules/not-002.js) | NOT-002 | 全角の「．」「，」。数字に挟まれたものは小数点と桁区切りとみなし、半角に直す候補を返す |
| [docs-rules/not-023](custom-rules/not-023.js) | NOT-023 | 全角スペースと、読点や句点の直後の半角スペース |
| [docs-rules/mkd-009](custom-rules/mkd-009.js) | MKD-009 | 語の途中に書いた「`__語__`」 |
| [docs-rules/mkd-010](custom-rules/mkd-010.js) | MKD-010 | リンクの文言の「こちら」「ここ」「リンク」など |
| [docs-rules/mkd-011](custom-rules/mkd-011.js) | MKD-011 | 空白だけの代替テキスト |

## markdownlint

Markdown記法のルール（[rules/markup.md](../rules/markup.md)）は、markdownlint-cli2で判定する。既定で有効な全ルールを土台にし、MD013（行の長さ）だけを無効にする。各MD番号とルールの対応は、`rules/markup.md`の「判定」欄と設定ファイルのコメントに書く。
