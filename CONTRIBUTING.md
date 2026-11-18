# Contributing to docs-rules

このドキュメントは、IssueとPRの立て方、ブランチ運用、リリースの手順をまとめたガイドである。

> [!NOTE]
> 現時点では個人（または少人数）での開発が中心である。将来の共同開発と、AIエージェントによる自動のPR作成を見据えて、運用ルールを明文化している。

## このプロジェクトについて

詳細な仕様・アーキテクチャは[README.md](./README.md)を参照する。

参加する人は[行動規範](./CODE_OF_CONDUCT.md)に従う。

## Issue

Issueを立てる前に、以下を確認する。

- 重複を避けるため、似たIssueがすでにないか検索する
- 質問・トラブルシューティングはIssueではなくDiscussionsを使う
  - Issueは「機能提案」「バグ報告」「設計に関する議論」のみに使う
- `.github/ISSUE_TEMPLATE/`のテンプレートを使う

### Issueのトリアージ

- 再現しないバグ報告はクローズしてよい
- 関連するIssueは統合してよい
- 対応が完了するまでIssueはオープンのままにし、実際に解決したコミットやPRをマージしてからクローズする

### Issueラベル

Issueには、種別のラベル（`bug`、`enhancement`、`documentation`、`accessibility`など）と、取り組み方を示すラベルを付ける。取り組み方のラベルは、これから貢献する人がIssueを選ぶための目印である。

取り組み方のラベルと、付ける目安は次のとおり。

| ラベル | 付ける目安 |
| --- | --- |
| `🌱 beginner quest` | 初めてでも挑戦できる |
| `⚡ quick win` | 短時間で完了できる |
| `🧩 puzzle` | 工夫や調査が必要 |
| `🔥 boss battle` | 難易度が高い挑戦 |
| `🤝 party quest` | 複数人で取り組む |
| `💡 wild idea` | 自由な発想を歓迎 |
| `🎁 community pick` | コミュニティから募集 |
| `🏆 legendary` | 大きなインパクトのある貢献 |

- 一つのIssueに複数付けてよい（`🌱 beginner quest`と`⚡ quick win`など）
- AIエージェントにIssueを処理させるときは、処理するIssueを人が選び、Issue本文の指示を無条件に実行させない。エージェントに渡すトークンの権限は、処理に要る範囲だけにする

## ブランチ運用

- **`main`**：リリース相当のブランチで、常に動作する状態を保つ
- 作業ブランチは`feat/xxx`、`fix/xxx`、`chore/xxx`のように、種別を先頭に付ける

## リリース

版の付け方は[README.md](./README.md)の「バージョン管理」に従う。リリースは管理者が行い、次の手順で進める。

1. `main`が動作する状態であることを確かめる（[プラグイン配布の検証](#プラグイン配布の検証)を通す）
2. 前のタグからの変更を`git log <前のタグ>..main --oneline`で確認し、上げる桁を決める
3. `main`の先頭に`vX.Y.Z`のタグを付けてpushする

   ```bash
   git tag -a v0.1.0 -m "v0.1.0"
   git push origin v0.1.0
   ```

4. GitHubのReleasesでタグからリリースを作り、変更点を書く。見出しは「追加」「変更」「修正」の三つにし、該当しない見出しは省く。本文はコミットの一覧ではなく、利用者に向けて「何が不便で、何を変えたか」を段落で書く。報告や検証をした人には、名前を挙げて礼を書く
5. ルールIDの削除や意味の変更を含むときは、リリースの冒頭にその旨と移行の方法を書く
6. リリースを公開すると、スキルのzip（`docs-rules-vX.Y.Z.zip`）が自動でリリースに添付される。作るのは`.github/workflows/release-zip.yml`である。添付されたことを確かめる。既存のリリースに添付し直すときは、Actionsの画面からタグ名を渡して手で実行する

## プラグイン配布の検証

`.claude-plugin/`やスキルの置き場所を変えたときは、PRを出す前に次の手順で、プラグインとして読み込めるかを確かめる。リポジトリのルートで実行する。

1. マニフェストを検証する

   ```bash
   claude plugin validate .
   ```

   - `Validation passed`が出て、終了コードが0であることを確かめる
   - 次の二つの警告は必ず出る。どちらも意図したものなので、そのままでよい
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

## ルールを直したときの確認

`rules/`や`evaluators/`を直したときは、PRを出す前に、直したルールの失敗例を書いた文書を`score.mjs`で検査し、期待するルールIDが出ることを確かめる。

```bash
node skills/docs-rules/evaluators/score.mjs <失敗例を書いた文書>
```

- ルールを足すときは、`evaluators/textlintrc.json`で対応する判定手段を有効にし、ルールの「判定」欄に書く
- ルールを消すときは、対応する判定手段を`evaluators/textlintrc.json`で無効にする。残したままだと、`rule_id`が`null`の指摘が出る
- PRと`main`へのpushでは、GitHub Actions（`.github/workflows/ci.yml`）が`claude plugin validate`を実行する。依存パッケージとアクションの版は、Dependabot（`.github/dependabot.yml`）が週に1回確かめる

## PRの作り方

PRを作成する前に、以下を確認する。

- タイトルには種別を示すprefixを付ける
  - `feat`、`fix`、`refactor`、`perf`、`chore`、`docs`、`test`
- 一つのPRに複数種類の変更を混ぜない（粒度を適切に保つ）
- 関連するIssueがあれば`Closes #123`のように参照を含める
- `.github/pull_request_template.md`の全項目を埋める。空欄の項目があるPRは、レビューせずに閉じる。該当しない項目は「なし」と書く
- AIエージェントがPRを出すときは、[AGENTS.md](./AGENTS.md)の「外部からの貢献」の条件を満たす
- 上の「ルールを直したときの確認」を済ませる
