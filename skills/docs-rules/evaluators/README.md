# evaluators/

`rules/`の`判定：機械`のルールをコードで判定するための設定とデータを置く。採点の入口（1コマンドで文書を渡し、違反の一覧を返す`score.mjs`）は#21で足す。

| 置くもの | 内容 | 状態 |
| --- | --- | --- |
| [data/](data/README.md) | 内閣告示の判定データ（JSON） | 置いた（#11） |
| [.markdownlint-cli2.jsonc](.markdownlint-cli2.jsonc) | markdownlintの設定 | 置いた（#14） |
| `score.mjs`、textlintの設定、prh辞書 | 採点の入口と、textlintで判定するルールの設定 | #21で置く |

## markdownlint

Markdown記法のルール（[rules/markup.md](../rules/markup.md)）は、markdownlint-cli2で判定する。方針はtextlint（[docs/textlint-policy.md](../../../docs/textlint-policy.md)）と同じで、依存パッケージとして使い、判定条件を写して自前で書くことはしない。

### 実行方法

- 前提：Node.js。`npx`で実行し、利用者に事前の`npm install`を求めない（#13の決定と同じ）
- 版：markdownlint-cli2の0.24.0に固定する。版を上げるときは、下の表とrules/markup.mdの`判定`欄を見直す
- Node.jsがない環境、初回の`npx`でパッケージを取得できない環境の扱いは、#21で決めたとおり、そのことを伝えたうえでSKILL.mdの自己点検に戻る

リポジトリの直下で、リポジトリ全体のMarkdownに当てるコマンドは次のとおり。利用者の文書に当てるときは、最後の引数を文書のパスにする。

```bash
npx -y markdownlint-cli2@0.24.0 --config skills/docs-rules/evaluators/.markdownlint-cli2.jsonc "**/*.md"
```

指摘が0件なら何も表示されず、終了コードが0になる。採点結果への統合（`checker`を`markdownlint：MD0xx`として同じJSONにまとめる）は#21で行う。

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
