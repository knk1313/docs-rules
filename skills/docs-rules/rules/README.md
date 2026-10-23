# rules/

全文書種別に共通する日本語の表記・文体・構成のルールを置く。文書種別に固有のルールはここに置かず、`schemas/`と`templates/`に置く。

## ファイルの分け方

ルールは次のファイルに分けて置く。

| ファイル | 内容 | IDのprefix |
| --- | --- | --- |
| [forbidden-words.md](forbidden-words.md) | 使わない語・言い回しと、その言い換え | `FW-` |
| [grammar.md](grammar.md) | 文法・文体（文末、文の長さ、接続、否定など） | `GRM-` |
| [notation.md](notation.md) | 表記（漢字とかな、送り仮名、外来語、数字、記号など） | `NOT-` |
| [markup.md](markup.md) | Markdown記法（見出し、箇条書、コードブロック、リンク、表など） | `MKD-` |
| [accessibility.md](accessibility.md) | アクセシビリティ（見た目に頼らない表現、表の扱い） | `ACC-` |
| [composition.md](composition.md) | 構成と内容（伝える内容の絞り方、結論の位置、見出し、用語の選び方） | `CMP-` |
| [examples.md](examples.md) | 段落単位の失敗例と成功例の対比 | なし（ルールIDを参照する） |

## 1ルールの書き方

各ルールは次の型で書く。項目の順序と名前は変えない。

```markdown
### FW-001 ルールの要約（「〜しない」「〜にする」の形で書く）

- ルール：何をどうするかを1〜2文で書く
- 理由：そのルールで読み手が得をする点を書く
- 出典：資料の略称と該当箇所
- 判定：機械（textlint：<ルール名>）
- 例：「失敗例」→「成功例」
```

- 見出しは`### <ID> <要約>`の形に固定する。`evaluators/`や他のIssueからはIDで参照する
- 項目名の後のコロンは全角の「：」で書き、後ろにスペースを入れない（NOT-026）
- 例は1行に収める。段落単位の長い例は`examples.md`に置き、ルールIDを付けて参照する

## IDの採番

- ファイルごとのprefixに3桁の連番を付ける（例：`FW-001`、`GRM-012`、`NOT-003`）
- 連番は追加順に振る。ファイル内の並び順と一致しなくてよい
- ルールを削除しても、その番号は再利用しない。削除したルールは見出しを残し、本文を「廃止（理由）」の1行にする

## 判定の印

「判定」には次の3値のどれかを書く。

| 値 | 意味 |
| --- | --- |
| `機械` | コードで判定できる。語の照合、文字数の計測、記号の検出など |
| `AI` | 文脈を読まないと判定できない。AI評価（[prompts/evaluate.md](../prompts/evaluate.md)）で扱う |
| `人` | 書き手の意図や事実関係を知らないと判定できない。人が読んで判断する |

- 対応する既存の判定ルールがあるときは、`機械（textlint：<ルール名>）`や`機械（markdownlint：<ルール名>）`のように括弧内に併記する
- ルール名はパッケージ名の`textlint-rule-`prefixを除いた形で書く（例：`ja-no-weak-phrase`）
- markdownlintのルール名はMD番号で書く（例：`MD004`）。同じ判定手段のルールが複数あるときは「、」で区切って並べる（例：`機械（markdownlint：MD001、MD003）`）
- prh辞書で判定するルールは`機械（textlint：prh）`と書く。辞書の項目にルールIDを書き、採点結果ではそのIDを返す
- `evaluators/`に置いた自前のtextlintルールは、ルール名の前に`docs-rules/`を付ける（例：`機械（textlint：docs-rules/not-012）`）
- 一つのルールに複数の判定手段があり、ツールが違うときは、ツール名ごとに続けて並べる（例：`機械（markdownlint：MD034、textlint：docs-rules/mkd-010）`）
- 書式を固定しておき、採点の入口（`evaluators/score.mjs`）が`判定：機械`の行を正規表現で拾えるようにする。採点の入口は、この欄からルールIDと判定手段の対応を作る

### 機械で判定できない部分をAI評価に回す

`判定：機械`のルールでも、機械では判定しきれない部分を残すことがある（GRM-002の論点の数など）。その部分は、ルールの下の注記に「AI評価で扱う」の言い回しで書く。

- 言い回しは「AI評価で扱う」に固定する。「AI評価で補う」のような別の言い回しは使わない
- [prompts/evaluate.md](../prompts/evaluate.md)は、`判定：機械`のルールのうち、注記にこの言い回しのあるものだけを評価の対象に入れる。それ以外の`判定：機械`のルールはAIで評価せず、`evaluators/score.mjs`の採点に任せる
- `tests/rules.test.mjs`が、注記に「AI評価」と書いたルールがこの言い回しを使っていることを確かめる

## 出典の書き方

- 出典には、[references/reference-sources.md](../references/reference-sources.md)で「採用」とした資料だけを使う。「参照のみ」の資料は名前と箇所だけを挙げ、文章は流用しない
- 出典を付けられないルールは載せない
- 原文の文章は写さず、自分の文章で書き直す。textlintなどのルールセットの説明文やエラーメッセージも写さない
- 複数の資料が根拠になるときは「、」で区切って並べる

各ファイルでは次の略称を使う。

| 略称 | 資料 | 箇所の書き方 |
| --- | --- | --- |
| 公用文作成の考え方 | 文化審議会建議「公用文作成の考え方」（令和4年1月7日） | 建議本文の項目番号（例：`Ⅱ5ウ(イ)`） |
| JTFスタイルガイド | 日本翻訳連盟「JTF日本語標準スタイルガイド」第4.0版 | 第4.0版の本文の項目番号（例：`2.3.1`） |
| 内閣告示 | 常用漢字表・送り仮名の付け方・外来語の表記 | 告示名と項目 |
| textlint | textlint-rule-preset-ja-technical-writing、textlint-rule-preset-jtf-style、textlint-rule-preset-ja-spacing内の各ルール | ルール名（例：`textlint：ja-no-weak-phrase`）。preset-jtf-styleのルールは`jtf-style/`を前に付ける（例：`textlint：jtf-style/4.3.1.丸かっこ（）`） |
| CommonMark Spec | CommonMark Spec 第0.31.2版（2024年1月28日） | 節番号（例：`4.2`）。複数は「・」で区切る |
| markdownlint | markdownlintの各ルール | MD番号（例：`MD004`） |
| Google開発者ドキュメントスタイルガイド | Google Developer Documentation Style Guide（英語） | ページ名と節の名前（例：`Accessibility > Tables`） |

- preset-jtf-styleのルール名の番号は、JTFスタイルガイド第2.2版の項目番号である。第4.0版では項目番号が変わったため、「出典」には第4.0版の番号を、「判定」にはpreset-jtf-styleのルール名をそのまま書く。両者の対応は[notation.md](notation.md)の冒頭を参照

「公用文作成の考え方」から書き直したルールは、文化庁の資料を基に編集・加工したものである。同資料は文部科学省ウェブサイト利用規約に従う。
