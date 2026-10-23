# Contributing Guide

このドキュメントは、Issue/PRの立て方から開発環境のセットアップ、コーディング規約までをまとめたガイドである。

> [!NOTE]
> 現時点では個人（または少人数）での開発が中心だが、将来的な共同開発・AIエージェントによる自動PR作成も見据えて、運用ルールを明文化している。

## このプロジェクトについて

詳細な仕様・アーキテクチャは[README.md](./README.md)を参照する。

参加する人は[行動規範](./CODE_OF_CONDUCT.md)に従う。

## Issue

Issueを立てる前に、以下を確認する。

- 重複を避けるため、似たIssueがすでに無いか検索する
- 質問・トラブルシューティングはIssueではなくDiscussionsを使う
  - Issueは「機能提案」「バグ報告」「設計に関する議論」のみに使う

### Issueのトリアージ

- 再現しないバグ報告はクローズしてよい
- 関連するIssueは統合してよい
- 対応が完了するまでIssueはオープンのままにし、実際に解決したコミット/PRがマージされてからクローズする

### Issueラベル（AIエージェント連携）

`claude:` prefixのラベルで、AIエージェントにIssueの処理を依頼する。

| ラベル | 意味 |
| --- | --- |
| `claude: design` | 設計案をIssueにコメントする。完了後`claude: design`を外して`claude: review`を付ける |
| `claude: review` | 設計案が付き、人間の確認待ち。確認したら`claude: review`を外して`claude: implement`を付ける |
| `claude: implement` | 実装してPRを作成する。完了後`claude: done`に変更する |
| `claude: needs-info` | 要件があいまいで進められないとき、または処理に失敗したとき。人間が補足してから再度ラベルを付け直す |
| `claude: done` | 処理完了済み |

- `design`と`implement`の両方が付いている場合は`design`として処理する
- 流れ：`design` → `review` → `implement` → `done`

## ブランチ運用

- **`main`**：常に動作する状態を保つ。リリース相当のブランチ
- 作業ブランチは`feat/xxx`, `fix/xxx`, `chore/xxx`のように種別をprefixする

## リリース

版の付け方は[README.md](./README.md)の「バージョン管理」に従う。リリースは管理者が行い、次の手順で進める。

1. `main`が動作する状態であることを確かめる（[プラグイン配布の検証](#プラグイン配布の検証)を通す）
2. 前のタグからの変更を`git log <前のタグ>..main --oneline`で確認し、上げる桁を決める
3. `main`の先頭に`vX.Y.Z`のタグを付けてpushする

   ```bash
   git tag -a v0.1.0 -m "v0.1.0"
   git push origin v0.1.0
   ```

4. GitHubのReleasesでタグからリリースを作り、変更点を書く。見出しは「追加」「変更」「修正」の3つにし、該当しない見出しは省く
5. ルールIDの削除や意味の変更を含むときは、リリースの冒頭にその旨と移行の方法を書く

## プラグイン配布の検証

`.claude-plugin/`やスキルの置き場所を変えたときは、PRを出す前に次の手順で、プラグインとして読み込めるかを確かめる。リポジトリのルートで実行する。

1. マニフェストを検証する

   ```bash
   claude plugin validate .
   ```

   - `Validation passed`が出て、終了コードが0であることを確かめる
   - 次の2つの警告は必ず出る。どちらも意図したものなので、そのままでよい
     - `version`がない（`plugin.json`に`version`を書かない運用のため）
     - ルートの`CLAUDE.md`はプロジェクトの文脈として読み込まれない（リポジトリの開発用のファイルのため）
   - これ以外の警告はClaude Codeの版によって増減する（例：アイコンがない）。内容を読み、プラグインの動作に関わるものでなければそのままでよい
   - 警告がエラー扱いになるため、`--strict`は付けない

2. 手元でインストールし、スキルが読み込まれるかを確かめる

   ```bash
   claude plugin marketplace add ./
   claude plugin install docs-rules@docs-rules
   claude plugin details docs-rules
   ```

   - `Component inventory`の`Skills (1)`に`docs-rules`が出ることを確かめる

3. 元に戻す

   ```bash
   claude plugin uninstall docs-rules@docs-rules
   claude plugin marketplace remove docs-rules
   ```

## PRの作り方

PRを作成する前に、以下を確認する。

- タイトルには種別を示すprefixをつける
  - `feat` / `fix` / `refactor` / `perf` / `chore` / `docs` / `test`
- 1つのPRに複数種類の変更を混ぜない（粒度を適切に保つ）
- 関連するIssueがあれば`Closes #123`のように参照を含める
- `.env.example`に影響する環境変数を追加した場合は必ず更新する
