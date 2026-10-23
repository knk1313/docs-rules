# 日本語の文書規約の一次資料調査

`skills/docs-rules/`のrules、schemas、prompts、evaluatorsに書くルールの根拠とする一次資料を決めるための調査結果。対応Issueは #1。 スキル単体で配布しても出典をたどれるよう、`skills/docs-rules/references/`に置く。

調査日は2026-10-17。ライセンスと版は調査時点の公式ページの記載に基づく。取り込む前に、各資料の本体に書かれた著作権表示を改めて確認する。

## 判断の軸

### 取り込み方

| 区分 | 意味 |
| --- | --- |
| reference | 原文（または抜粋）をリポジトリに置き、出典として参照させる |
| rules | 自分の文章でルールに書き直して`rules/`に置く。原文は置かない |
| prompts | AI評価・書き直し用のプロンプトの観点として使う |
| evaluators | コードで判定する。既存実装があれば参考にする |
| 参照のみ | リポジトリに原文は置かず、出典として名前とURLだけを挙げる。「採用」かつ「参照のみ」は、根拠として使うが文章は置かないことを表す |

### 担当する層

| 層 | 単位 | 例 |
| --- | --- | --- |
| 表記 | 文字 | 漢字とかなの使い分け、送り仮名、全角・半角、記号 |
| 文体 | 文 | 文末の統一、冗長表現、一文の長さ |
| 構成 | 文書 | 見出し階層、必須セクション、文書の型 |
| 内容 | 意味 | 網羅性、具体性、根拠の明確さ |

### ライセンスの扱い

- 原文をリポジトリに含めてよいのは、改変・再配布が許されたライセンス（CC BY 4.0など）か、著作権の目的とならないもの（告示など）に限る
- それ以外は、自分の文章でルールに書き直すか、参照のみに留める
- 書き直す場合でも、出典として資料名と該当箇所を各ルールに付ける

## 調査結果一覧

| 候補 | 採用 | 取り込み方 | ライセンス | 担当する層 |
| --- | --- | --- | --- | --- |
| 公用文作成の考え方（文化審議会建議） | 採用 | rules / prompts | 文部科学省ウェブサイト利用規約（CC BY 4.0互換） | 表記・文体・構成 |
| 常用漢字表・送り仮名の付け方・外来語の表記（内閣告示） | 採用 | rules / evaluators | 告示のため著作権の目的とならない（著作権法第13条） | 表記 |
| JTF日本語標準スタイルガイド（日本翻訳連盟） | 採用 | rules / evaluators | CC BY 4.0（第3.0版から。基準は第4.0版） | 表記 |
| 日本語スタイルガイド（テクニカルコミュニケーター協会） | 参照のみ | 参照のみ | 市販書籍のため転載不可 | 文体・構成 |
| Microsoft日本語スタイルガイド | 参照のみ | 参照のみ | 利用・転載条件を確認できず | 表記・文体 |
| textlint preset-ja-technical-writing | 採用 | evaluators | MIT | 表記・文体 |
| textlint preset-jtf-style | 採用 | evaluators | MIT | 表記 |
| textlint preset-ja-spacing | 採用 | evaluators | MIT | 表記 |
| markdownlint | 採用 | evaluators | MIT | 構成（Markdown記法） |
| CommonMark Spec | 採用 | 参照のみ | CC BY-SA 4.0 | 構成（Markdown記法） |
| Google Developer Documentation Style Guide | 採用 | prompts / 参照のみ | CC BY 4.0（サンプルコードはApache 2.0） | 構成・内容 |
| Diátaxis | 採用 | prompts / 参照のみ | CC BY-SA 4.0（GitHubリポジトリのREADMEに記載） | 構成 |
| 記者ハンドブック（共同通信社）、NHK漢字表記辞典など | 参照のみ | 参照のみ | 市販書籍のため転載不可 | 表記 |

## 候補ごとの判断

### 公用文作成の考え方

- 発行：文化審議会が令和4年1月7日に文部科学大臣へ建議。昭和26年の「公用文作成の要領」に代わる手引
- 判断：採用。表記・文体・構成の3層にまたがる公的基準で、ルールの根拠として最も説明しやすい
- 取り込み方：表記と文体の項目は`rules/`に書き直す。「読み手に伝わる文書」を扱う構成の項目は、`prompts/`の評価観点にする
- ライセンス：文化庁サイトのコンテンツは文部科学省ウェブサイト利用規約に従う。同規約はCC BY 4.0と互換で、出典の記載と、編集・加工した旨の記載が必要。国が作成したかのような形で公表することは禁止されている
- 注意：建議は告示ではないため、著作権法第13条の対象外として扱う。原文を置く場合は利用規約の条件を守る

### 常用漢字表・送り仮名の付け方・外来語の表記

- 判断：採用。漢字の使用範囲、送り仮名、カタカナ語の表記の根拠になる
- 取り込み方：判定基準を`rules/`に書き、機械的に判定できる部分（常用漢字外の漢字、送り仮名の揺れ）は`evaluators/`で扱う
- ライセンス：内閣告示は著作権法第13条により権利の目的とならないため、表そのものをデータとして置いてよい
- データの置き場所：[evaluators/data/](../evaluators/data/README.md)。常用漢字表は`joyo-kanji.json`、送り仮名の付け方は`okurigana.json`、外来語の表記は`gairaigo.json`に置いた

### JTF日本語標準スタイルガイド

- 判断：採用。表記ルールが項目化されており、機械判定に向く
- 取り込み方：項目を`rules/`に書き直す。textlint preset-jtf-styleが同ガイドをコード化しているため、`evaluators/`はそれを参考にする
- ライセンス：公式ページによると、第3.0版からCC BY 4.0。原文の抜粋を置く場合は出典と改変の有無を示す
- 版：最新は第4.0版（2026年7月25日）。ルールの出典には第4.0版を使い、版数を併記する
- 注意：翻訳者向けのガイドのため、翻訳に固有の項目は取り込まない

### 日本語スタイルガイド（テクニカルコミュニケーター協会）

- 判断：参照のみ。技術文書の文体・構成について網羅的だが、市販の書籍で原文を転載できない
- 取り込み方：ルールを書く際の確認用の資料として名前を挙げる。文章表現は流用しない

### Microsoft日本語スタイルガイド

- 判断：参照のみ。大手企業の公開ガイドの例として有用だが、PDFの利用・転載条件を今回の調査では確認できなかった
- 取り込み方：参照先としてURLを挙げる。条件を確認できるまで原文や抜粋は置かない

### textlintのルールセット

- 対象：preset-ja-technical-writing、preset-jtf-style、preset-ja-spacing
- 判断：採用。日本語の表記・文体ルールがすでにコード化されており、`evaluators/`の実装量を減らせる
- 取り込み方：`evaluators/`から依存パッケージとして使い、`npx`で実行する。判定条件を写して自前で実装することはしない。決めた経緯と、各ルールを有効にするか無効にするかは、リポジトリの[docs/textlint-policy.md](https://github.com/knk1313/docs-rules/blob/main/docs/textlint-policy.md)に書いた（#13）
- ライセンス：いずれもMIT。依存パッケージとして使い、コードをリポジトリに写さない。コードを取り込むことになった場合は著作権表示と許諾表示を残す

### markdownlintとCommonMark

- 判断：採用。Markdown記法のルールの根拠と判定手段になる
- 取り込み方：markdownlintは`evaluators/`で使う。CommonMark Specは記法の根拠として参照のみとし、`rules/`のMarkdown記法ルールに出典として付ける
- 置き場所：記法のルールは[rules/markup.md](../rules/markup.md)、markdownlintの設定は[evaluators/.markdownlint-cli2.jsonc](../evaluators/.markdownlint-cli2.jsonc)に置いた（#14）
- ライセンス：markdownlintはMIT。CommonMark SpecはCC BY-SA 4.0で、原文を置くと同じライセンスでの公開が必要になるため、原文は置かない

### Google Developer Documentation Style GuideとDiátaxis

- 判断：採用。英語の資料だが、文書の型と構成の考え方を`schemas/`と`prompts/`の参考にする
- 取り込み方：文書種別ごとの構成の考え方（Diátaxisのチュートリアル・ハウツー・リファレンス・解説の4分類など）を、日本語の文書種別に合わせて書き直す。英語の文体ルールは取り込まない
- ライセンス：GoogleのガイドはCC BY 4.0（サンプルコードはApache 2.0）。Diátaxisはサイト上にライセンスの記載がないが、GitHubリポジトリのREADMEにCC BY-SA 4.0と明記されている。原文を置くと同じライセンスでの公開が必要になるため、CommonMarkと同様に考え方の参照に留め、文章は置かない

### 書籍ベースの規約

- 対象：記者ハンドブック、NHK漢字表記辞典など
- 判断：参照のみ。原文を転載できないため、出典として名前を挙げるに留める

## 層ごとのカバー状況

| 層 | 主な根拠 | コードで判定する手段 |
| --- | --- | --- |
| 表記 | 内閣告示、JTF日本語標準スタイルガイド、公用文作成の考え方 | textlint（preset-jtf-style、preset-ja-spacing、preset-ja-technical-writing） |
| 文体 | 公用文作成の考え方 | textlint（preset-ja-technical-writing） |
| 構成 | 公用文作成の考え方、Diátaxis、Google Developer Documentation Style Guide、CommonMark | markdownlint（Markdown記法と見出し階層） |
| 内容 | 公用文作成の考え方、Google Developer Documentation Style Guide | なし。`prompts/`によるAI評価で扱う |

内容の層には、コードで判定できる一次資料がない。AI評価の観点を書く際は、上記の資料から観点を抜き出して出典を付ける。

## 取り込みIssueの候補

採用した資料ごとに、次のIssueを別途起票する。

- 公用文作成の考え方を`rules/`の表記・文体ルールに書き直す（#3と関連）。項目ごとの取り込み先は[koyobun-mapping.md](koyobun-mapping.md)
- 常用漢字表・送り仮名の付け方・外来語の表記を判定データとして置く
- JTF日本語標準スタイルガイドの表記項目を`rules/`に書き直す（#3と関連）
- textlintのルールセットを`evaluators/`から使う方針を決める
- markdownlintを`evaluators/`で使い、CommonMarkをMarkdown記法ルールの出典にする
- Google Developer Documentation Style GuideとDiátaxisを参考に、文書種別の構成の考え方を`schemas/`に反映する（#4と関連）

## 出典

- [文化庁「文化審議会建議『公用文作成の考え方』について」](https://www.bunka.go.jp/koho_hodo_oshirase/hodohappyo/93650001.html)
- [文化庁「文化庁ホームページについて」](https://www.bunka.go.jp/bunkacho_homepage/index.html)
- [文部科学省「文部科学省ウェブサイト利用規約」](https://www.mext.go.jp/b_menu/1351168.htm)
- [日本翻訳連盟「JTF日本語標準スタイルガイド」](https://www.jtf.jp/tips/styleguide)
- [Microsoft「日本語スタイルガイド」](https://download.microsoft.com/download/a/8/2/a822a118-18d4-4429-b857-1b65ab388315/jpn-jpn-StyleGuide.pdf)
- [textlint-rule-preset-ja-technical-writing](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing)
- [textlint-rule-preset-jtf-style](https://github.com/textlint-ja/textlint-rule-preset-jtf-style)
- [textlint-rule-preset-ja-spacing](https://github.com/textlint-ja/textlint-rule-preset-ja-spacing)
- [markdownlint](https://github.com/DavidAnson/markdownlint)
- [CommonMark Spec](https://spec.commonmark.org/)
- [Google Developers「Site Policies」](https://developers.google.com/site-policies)
- [Diátaxis](https://diataxis.fr/)
- [evildmp/diataxis-documentation-framework（ライセンス記載）](https://github.com/evildmp/diataxis-documentation-framework)
