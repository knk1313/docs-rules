# セキュリティポリシー

docs-rulesの脆弱性を見つけたときの報告先と、報告の後に起きることを示します。

## 対象

このリポジトリが配布するもののうち、次のものが対象です。

- `skills/docs-rules/`のスキル本体（SKILL.md、rules、schemas、templates）
- `skills/docs-rules/evaluators/`の判定データ、markdownlintの設定、`data/tools/`のPythonスクリプト
- `.github/workflows/`のGitHub Actionsのワークフロー
- `tests/`のスクリプト

スキルはMarkdownの指示をAIエージェントに読ませるものです。指示の中に、エージェントにリポジトリの外への操作や秘密情報の出力をさせる記述が紛れ込んでいた場合も、脆弱性として扱います。

次のものは対象外です。それぞれの配布元に報告してください。

- Claude Codeや、スキルを読み込む他のエージェントの本体
- textlint、markdownlint、Pythonなど、`evaluators/`が依存するソフトウェア

## 報告先

公開のIssue、Pull Request、Discussionsには書かないでください。次のどちらかで報告してください。

- メール：<yuta.kondo0207@gmail.com>
- GitHubの[Private vulnerability reporting](https://github.com/knk1313/docs-rules/security/advisories/new)

報告には、影響を受けるファイルと版（タグかコミット）、再現の手順、想定される影響を書いてください。

## 報告の後に起きること

- 受け取った連絡を7日以内に返します
- 対応するかどうかと、対応する場合の見込みを30日以内に伝えます
- 修正はパッチ版としてリリースし、Releasesに概要を書きます。報告した人の名前は、本人が望む場合にだけ載せます
- 修正が公開されるまで、報告の内容は公開しないでください

## 対応する版

最新のタグと`main`だけに対応します。古いタグには修正を出しません。
