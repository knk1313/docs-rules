# tests/

リポジトリの構成が壊れていないかを確かめるテストを置く。依存パッケージは使わない。リポジトリのルートで実行する。

| ファイル | 確かめること | 実行 |
| --- | --- | --- |
| [test_skill_size.py](test_skill_size.py) | `skills/*/SKILL.md`が20,000バイト未満であること。Claude Codeがコンテキストの圧縮後にスキルを20,000文字で切り捨てるため | `python3 tests/test_skill_size.py` |
| [rules.test.mjs](rules.test.mjs) | `rules/`の各ルールの型（項目の順序、IDの形と重複、`判定`の書式、出典の略称）と、一覧表と本文の一致 | `node --test tests/*.test.mjs` |
| [schemas.test.mjs](schemas.test.mjs) | `schemas/`の型と必須セクション表、`templates/`の見出しとの一致、各READMEの一覧と実ファイルの一致 | 同上 |
| [repo-lint.test.mjs](repo-lint.test.mjs) | リポジトリのMarkdownに`evaluators/score.mjs`とmarkdownlint-cli2を当て、違反が0件であること | 同上 |

- `test_skill_size.py`はPython 3の標準ライブラリだけで動く
- `*.test.mjs`はNode.js 18以上の組み込みのテストランナーで動く。`repo-lint.test.mjs`は`npx`でtextlintとmarkdownlint-cli2を取得するため、初回はネットワークが要る。`npx`が使えないときは、テストを飛ばしたことを出力する
- 実行方法の詳細と除外条件は、CONTRIBUTING.mdの「テスト」を参照
