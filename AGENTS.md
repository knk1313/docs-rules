# AGENTS.md

このファイルはこのリポジトリで動くAIコーディングエージェント（Claude Code / OpenAI Codex等）が共通で参照する **絶対禁止事項と最低限のチェック** を集めた索引。

- **Claude Code**：ルート`CLAUDE.md`から`@AGENTS.md`で取り込まれる
- **OpenAI Codex**：ルート`AGENTS.md`を直接読み込む 

人間contributor向けの一般規約（Issue / PRの出し方など）は[CONTRIBUTING.md](CONTRIBUTING.md)を参照。本ファイルはAIが **コードを書く・直す・出す** 際に踏み外してはいけない事項に絞る。

## プロジェクト概要

`README.md`を参照（技術スタック・ディレクトリ構成）。

## git操作

**gitを操作しない。** ブランチの作成・切り替え、`add` / `commit` / `push` / `merge` /
`rebase` / `reset` / `stash`、PRの作成はすべて人間が行う。明示的に依頼された場合のみ実行する。

コード変更は作業ツリーに残すところまでで止め、状態確認のための読み取り専用のコマンド
（`git status` / `git log` / `git diff`など）は実行してよい。

## ファイル編集

**ファイルの書き換えにシェルコマンドを使わない。** `sed -i`、`python -c`、ヒアドキュメントによる上書きではなく、エージェントが持つ編集用のツール（Claude CodeではEdit / Write）を使う。

## 規約

- **コミットメッセージ**：日本語。機能追加は`feat:`などのprefixを付ける。
- **Issue**：タイトルにPRと同じ種別prefix（`feat` / `fix` / `refactor` / `perf` / `chore` / `docs` / `test`）を付ける。本文は`.github/ISSUE_TEMPLATE/`のテンプレート（`機能追加.md` / `バグ修正.md`）のいずれかを選び、その見出し構成のまま全項目を埋める。調査タスクは`機能追加.md`を使う。`claude:`ラベルによる処理依頼の運用は[CONTRIBUTING.md](CONTRIBUTING.md)の「Issueラベル」に従う。
- **PR**：`.github/pull_request_template.md`の見出し構成のまま全項目を埋める。
- **Pythonコードのコメント・ドキュメント文字列**：日本語で記述する。
- **日本語の文章**：このリポジトリで書くMarkdown、Issue、PR、コミットメッセージの日本語は、`skills/docs-rules/rules/`のルール（禁止語・文法・表記）に従う。ルール集自身がルールに反していないかも同じ基準で見る。
