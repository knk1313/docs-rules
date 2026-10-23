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

## テスト

`rules/`・`schemas/`・`templates/`を直したときは、PRを出す前にリポジトリの直下で次のコマンドを実行し、すべて通ることを確かめる。

```bash
node --test tests/*.test.mjs
```

- 前提：Node.js 18以上。依存パッケージは要らない。`tests/repo-lint.test.mjs`は`npx`でtextlintとmarkdownlint-cli2を取得するため、初回はネットワークが要る
- `npx`が使えないとき、パッケージを取得できないときは、採点のテストを飛ばし、飛ばしたことを出力する
- Node.js 22では`node --test tests/`のようにディレクトリを渡すと動かないため、ファイルを`tests/*.test.mjs`で指定する
- PRと`main`へのpushでは、GitHub Actions（`.github/workflows/ci.yml`）が同じテストと`claude plugin validate`を実行する。依存パッケージとアクションの版は、Dependabot（`.github/dependabot.yml`）が週に1回確かめる

テストのファイルごとに確かめることは次のとおり。

| ファイル | 確かめること |
| --- | --- |
| `tests/rules.test.mjs` | `rules/`の各ルールの型（項目の順序、IDの形と重複、`判定`の書式、出典の略称）と、一覧表と本文の一致 |
| `tests/schemas.test.mjs` | `schemas/`の型と必須セクション表、`templates/`の見出しとの一致、各READMEの一覧と実ファイルの一致 |
| `tests/repo-lint.test.mjs` | リポジトリのMarkdownに`evaluators/score.mjs`とmarkdownlint-cli2を当て、違反が0件であること |
| `tests/compare.test.mjs` | `evaluators/compare.mjs`が、書き直しの前後の採点結果を、直った違反、残った違反、新しく出た違反、2回続けて残った違反に分けること |

`tests/repo-lint.test.mjs`は、ルールの型に由来する誤検出を、採点対象を書き換えずにテストの除外条件で外している。除外条件はファイルの`EXCLUSIONS`に理由と合わせて書く。対象は次の七つである。

- 見出しのルールIDの後のスペース
- 出典欄
- 判定欄
- 「」の中の例示
- 『』の中の題名（原文のまま写すため）
- `examples.md`の失敗例
- 日本語を含まない行

## PRの作り方

PRを作成する前に、以下を確認する。

- タイトルには種別を示すprefixを付ける
  - `feat`、`fix`、`refactor`、`perf`、`chore`、`docs`、`test`
- 一つのPRに複数種類の変更を混ぜない（粒度を適切に保つ）
- 関連するIssueがあれば`Closes #123`のように参照を含める
- `.github/pull_request_template.md`の全項目を埋める。「人が書く要約」は人が自分の言葉で書く。空欄の項目があるPRと、人が確認した形跡のないPRは、レビューせずに閉じる
- AIエージェントがPRを出すときは、[AGENTS.md](./AGENTS.md)の「外部からの貢献」の条件を満たす
- `python3 tests/test_skill_size.py`と`node --test tests/*.test.mjs`を通す（[tests/README.md](./tests/README.md)と上の「テスト」を参照）
