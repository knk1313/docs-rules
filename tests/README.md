# tests/

リポジトリの構成が壊れていないかを確かめるテストを置く。依存パッケージは使わない。リポジトリのルートで実行する。

テストのファイルと、確かめること、実行のコマンドは次のとおり。

| ファイル | 確かめること | 実行 |
| --- | --- | --- |
| [test_skill_size.py](test_skill_size.py) | `skills/*/SKILL.md`が2万バイト未満であること。Claude Codeがコンテキストの圧縮後にスキルを2万文字で切り捨てるため。 | `python3 tests/test_skill_size.py` |
| [rules.test.mjs](rules.test.mjs) | `rules/`の各ルールの型（項目の順序、IDの形と重複、`判定`の書式、出典の略称）と、一覧表と本文の一致 | `node --test tests/*.test.mjs` |
| [schemas.test.mjs](schemas.test.mjs) | `schemas/`の型と必須セクション表、`templates/`の見出しとの一致、各READMEの一覧と実ファイルの一致 | 同上 |
| [repo-lint.test.mjs](repo-lint.test.mjs) | リポジトリのMarkdownに`evaluators/score.mjs`とmarkdownlint-cli2を当て、違反が0件であること。`skills/`の下に「.」で始まるファイルがないこと | 同上 |
| [score.test.mjs](score.test.mjs) | `evaluators/score.mjs`が、違反を含む決まった文書で期待するルールIDを返すこと。終了コード0〜3、`--type`の照合、重複した指摘の統合、番号を数量として直さないこと | 同上 |
| [compare.test.mjs](compare.test.mjs) | `evaluators/compare.mjs`が、書き直しの前後の採点結果を、直った違反、残った違反、新しく出た違反、2回続けて残った違反に分けること | 同上 |
| [exclusions.test.mjs](exclusions.test.mjs) | `repo-lint.test.mjs`の除外条件（[lib/exclusions.mjs](lib/exclusions.mjs)）が、外すべき誤検出だけを外し、同じ場所にある本物の違反を外さないこと | 同上 |

- `test_skill_size.py`はPython 3の標準ライブラリだけで動く
- `*.test.mjs`はNode.js 18以上の組み込みのテストランナーで動く
- `repo-lint.test.mjs`と`score.test.mjs`は、初回にネットワークが要る。採点のテストでは`score.mjs`がtextlintを`npm ci`で入れ、markdownlintのテストでは`npx`でmarkdownlint-cli2を取得するため
- `npx`が使えないとき、パッケージを取得できないときは、テストを飛ばしたことを出力する。CI（環境変数`CI`がある）では、飛ばさずに失敗として扱う
- 実行方法の詳細と除外条件は、CONTRIBUTING.mdの「テスト」を参照
