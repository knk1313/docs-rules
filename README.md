# docs-rules

[![CI](https://github.com/knk1313/docs-rules/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/knk1313/docs-rules/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/knk1313/docs-rules)](https://github.com/knk1313/docs-rules/releases)
[![License: MIT](https://img.shields.io/github/license/knk1313/docs-rules)](LICENSE)
[![Stars](https://img.shields.io/github/stars/knk1313/docs-rules)](https://github.com/knk1313/docs-rules/stargazers)

日本語の文書を、表記・文体・Markdown記法のルールに沿って書き、機械の検査で確かめるためのClaude Codeスキルです。

## 何をするか

スキルを入れると、Claude Codeは日本語の文書を書く前に`rules/`のルールを読み、書き終えた後に`evaluators/score.mjs`で検査して、違反を直します。ルールはすべて、textlintとmarkdownlintで機械的に検査できるものだけに絞っています。

| ファイル | 主なルール |
| --- | --- |
| `rules/notation.md` | 全角と半角の間、全角どうし、括弧の前後にスペースを入れない。「。」「、」を使う。「！」「？」、半角カナ、全角英数字を使わない |
| `rules/grammar.md` | 常体と敬体を混ぜない。見出しに句点を付けない。「が」で文をつながない。同じ助詞を続けない。二重否定、ら抜き言葉を使わない |
| `rules/forbidden-words.md` | 「〜することができる」は「〜できる」、「〜を行う」「〜を実施する」は「〜する」と書く |
| `rules/markup.md` | 見出しの階層、箇条書の記号、コードブロックの言語名、リンクの文言、表の形などのMarkdown記法 |

検査で誤検出や直せない違反に気付いたときは、改善点の候補として手元のファイルにためます。たまった候補は、`docs-rules-feedback`スキルでIssueにできます。

## インストール

Claude Codeでは3通りあります。claude.aiで使う場合は、4のとおりzipをアップロードします。

### 1. 手動配置

クローンして、スキルディレクトリに置きます。

```bash
git clone https://github.com/knk1313/docs-rules.git
mkdir -p ~/.claude/skills
cp -r docs-rules/skills/docs-rules ~/.claude/skills/docs-rules
cp -r docs-rules/skills/docs-rules-feedback ~/.claude/skills/docs-rules-feedback
```

`docs-rules-feedback`は、改善点をIssueにするためのスキルです。使わない場合は、2行目のコピーを省けます。

Claude Codeは、再起動時にこのスキルを読み込みます。

### 2. `npx skills add`

GitHubから直接入れます。

```bash
npx skills add knk1313/docs-rules
```

### 3. Claude Codeプラグイン

Claude Codeのセッション内で実行します。

```text
/plugin marketplace add knk1313/docs-rules
/plugin install docs-rules@docs-rules
```

### 4. claude.aiへのアップロード

[Releases](https://github.com/knk1313/docs-rules/releases)から`docs-rules-vX.Y.Z.zip`を取得し、claude.aiのスキルの設定でアップロードします。zipは、リリースを公開したときにGitHub Actionsが作ります。zipには`docs-rules-feedback`を入れていません。

## 使い方

インストールしたうえで、Claude Codeのセッションで日本語の文書を頼みます。

```text
今日の作業をMarkdownにまとめて
```

既存の文書を直すこともできます。プラグインとして入れた場合は、スラッシュコマンドで明示的に呼べます。

```text
/docs-rules:docs-rules README.mdを校正して
```

検査だけを手で動かすこともできます。

```bash
node skills/docs-rules/evaluators/score.mjs README.md
```

たまった改善点の候補は、次のように頼むとIssueの下書きになります。下書きを確かめて承認したものだけが、Issueとして出ます。

```text
docs-rulesの改善点をIssueにして
```

## 動作環境

- Claude Codeで動作を確かめています。スキルの本体はMarkdownだけなので、`SKILL.md`の形式を読める他のエージェントでも読めます
- 検査（`evaluators/score.mjs`）には、Node.js 18以上とnpmが要ります。ない環境では検査を飛ばし、ルールを読んで目で確かめます
- 検査は、初回の実行でtextlintとmarkdownlint-cli2をnpmから取得し、利用者のキャッシュ（macOSは`~/Library/Caches/docs-rules`）に入れます。版は`package-lock.json`で依存の依存まで固定し、インストール時のスクリプトは動かしません。詳しくは[evaluators/README.md](skills/docs-rules/evaluators/README.md)を参照してください

## ディレクトリ構成

```text
docs-rules/
├── .claude-plugin/         # Claude Codeプラグインとマーケットプレイスのマニフェスト
├── .github/                # IssueとPRのテンプレート、GitHub Actionsのワークフロー、Dependabotの設定
├── ci/                     # CIのプラグインの検証で使うClaude Codeの版
├── skills/
│   ├── docs-rules/
│   │   ├── SKILL.md
│   │   ├── rules/          # 表記、文体、禁止語、Markdown記法のルール
│   │   └── evaluators/     # 検査の入口（score.mjs）、textlintとmarkdownlintの設定、prh辞書、自前のtextlintルール
│   └── docs-rules-feedback/
│       ├── SKILL.md        # 改善点の候補をIssueにする手順
│       └── scripts/        # 改善点の候補をためる（feedback.mjs）
├── AGENTS.md               # AIエージェント向けの禁止事項と規約
├── CLAUDE.md               # Claude Code用の入口（AGENTS.mdを読み込む）
├── CODE_OF_CONDUCT.md      # 行動規範（Contributor Covenant 2.0 を基にしたもの）
├── CONTRIBUTING.md         # IssueとPRの出し方
├── LICENSE
├── README.md
└── SECURITY.md             # 脆弱性の報告先と対応の方針
```

## バージョン管理

[Semantic Versioning 2.0.0](https://semver.org/lang/ja/)に従い、`vX.Y.Z`の形のgitタグで版を示します。タグはgitだけに置き、`plugin.json`にはバージョンを書きません。

| 上げる桁 | 変更の内容 |
| --- | --- |
| X（メジャー） | 既存のルールIDの削除や意味の変更、検査の出力の項目の削除や型の変更、インストール方法の変更 |
| Y（マイナー） | ルールの追加など、既存の利用者がそのまま使える変更 |
| Z（パッチ） | 誤字や説明の修正、誤検出や見逃しの直し |

- `1.0.0`までは`0.Y.Z`で、マイナーの変更にもルールIDの削除や意味の変更を含めることがあります
- 変更点は[Releases](https://github.com/knk1313/docs-rules/releases)に書きます。リリースの手順は[CONTRIBUTING.md](CONTRIBUTING.md)の「リリース」を参照してください

## 利用条件

本リポジトリはMITライセンスで公開しています。全文は[LICENSE](LICENSE)を参照してください。

ただし、`skills/docs-rules/rules/`の一部は、次の資料を基に編集・加工したものです。各ルールの「出典」欄に、資料名と該当箇所を書いています。

| 資料 | 資料の利用条件 | 本リポジトリでの扱い |
| --- | --- | --- |
| [公用文作成の考え方](https://www.bunka.go.jp/koho_hodo_oshirase/hodohappyo/93650001.html)（文化審議会建議、令和4年1月7日） | [文部科学省ウェブサイト利用規約](https://www.mext.go.jp/b_menu/1351168.htm)（CC BY 4.0互換） | 文化庁の資料を基に、自分の文章で書き直して編集・加工しています |
| [新しい時代に応じた国語施策について（審議経過報告）](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kakuki/20/tosin03/09.html)（第20期国語審議会、平成7年） | [文部科学省ウェブサイト利用規約](https://www.mext.go.jp/b_menu/1351168.htm)（CC BY 4.0互換） | 文化庁の資料を基に、自分の文章で書き直して編集・加工しています。GRM-019に使います |
| [JTF日本語標準スタイルガイド](https://www.jtf.jp/tips/styleguide)第4.0版（日本翻訳連盟） | CC BY 4.0 | 自分の文章で書き直して編集・加工しています |
| [デジタル庁デザインシステム](https://design.digital.go.jp/dads/)（リンクテキストのページ） | 公共データ利用規約（PDL1.0、CC BY 4.0互換） | デジタル庁の資料を基に、自分の文章で書き直して編集・加工しています。MKD-010に使います |

- 上の資料の作成元は、本リポジトリの作成や内容に関わっていません。本リポジトリのルールは、作成元の見解を示すものではありません
- CC BY-SA 4.0の資料（CommonMark Spec）は、考え方の参照にとどめ、文章をリポジトリに置きません
