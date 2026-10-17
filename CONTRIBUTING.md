# Contributing Guide

このドキュメントは、Issue/PRの立て方から開発環境のセットアップ、コーディング規約までをまとめたガイドです。

> [!NOTE]
> 現時点では個人（または少人数）での開発が中心ですが、将来的な共同開発・AIエージェントによる自動PR作成も見据えて、運用ルールを明文化しています。

## このプロジェクトについて

詳細な仕様・アーキテクチャは [README.md](./README.md) を参照してください。

## Issue

Issueを立てる前に、以下を確認してください。

- 重複を避けるため、似たIssueがすでに無いか検索する
- 質問・トラブルシューティングはIssueではなく Discussions を使う
  - Issueは「機能提案」「バグ報告」「設計に関する議論」のみに使う

### Issueのトリアージ

- 再現しないバグ報告はクローズしてよい
- 関連するIssueは統合してよい
- 対応が完了するまでIssueはオープンのままにし、実際に解決したコミット/PRがマージされてからクローズする

### Issueラベル（AIエージェント連携）

`claude:` prefix のラベルで、AIエージェントにIssueの処理を依頼する。

| ラベル | 意味 |
| --- | --- |
| `claude: design` | 設計案をIssueにコメントする。完了後 `claude: design` を外して `claude: review` を付ける |
| `claude: review` | 設計案が付き、人間の確認待ち。確認したら `claude: review` を外して `claude: implement` を付ける |
| `claude: implement` | 実装してPRを作成する。完了後 `claude: done` に変更する |
| `claude: needs-info` | 要件があいまいで進められないとき、または処理に失敗したとき。人間が補足してから再度ラベルを付け直す |
| `claude: done` | 処理完了済み |

- `design` と `implement` の両方が付いている場合は `design` として処理する
- 流れ: `design` → `review` → `implement` → `done`

## ブランチ運用

- **`main`**: 常に動作する状態を保つ。リリース相当のブランチ
- 作業ブランチは `feat/xxx`, `fix/xxx`, `chore/xxx` のように種別をprefixする

## PRの作り方

PRを作成する前に、以下を確認してください。

- タイトルには種別を示すprefixをつける
  - `feat` / `fix` / `refactor` / `perf` / `chore` / `docs` / `test`
- 1つのPRに複数種類の変更を混ぜない（粒度を適切に保つ）
- 関連するIssueがあれば `Closes #123` のように参照を含める
- `.env.example` に影響する環境変数を追加した場合は必ず更新する
