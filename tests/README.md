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
| [corpus.test.mjs](corpus.test.mjs) | [corpus/](corpus/)の対の文で、機械で判定するルールが違反した文を見つけ、直した文を指摘しないこと。許した見逃しと誤検出は[corpus/known.json](corpus/known.json)に理由とともに置き、一覧にないものが出たときと、一覧にあるのに出なくなったときに失敗にする | 同上 |
| [exclusions.test.mjs](exclusions.test.mjs) | `repo-lint.test.mjs`の除外条件（[lib/exclusions.mjs](lib/exclusions.mjs)）が、外すべき誤検出だけを外し、同じ場所にある本物の違反を外さないこと | 同上 |

- `test_skill_size.py`はPython 3の標準ライブラリだけで動く
- `*.test.mjs`はNode.js 18以上の組み込みのテストランナーで動く
- `repo-lint.test.mjs`と`score.test.mjs`は、初回にネットワークが要る。採点のテストでは`score.mjs`がtextlintを`npm ci`で入れ、markdownlintのテストでは`npx`でmarkdownlint-cli2を取得するため
- `npx`が使えないとき、パッケージを取得できないときは、テストを飛ばしたことを出力する。CI（環境変数`CI`がある）では、飛ばさずに失敗として扱う
- 実行方法の詳細と除外条件は、CONTRIBUTING.mdの「テスト」を参照

## コーパス

`corpus/`には、機械で判定するルールごとの対の文を置く（#67）。対の文は、ルールに違反した文と、それを直した文の組である。

- `corpus/pairs/<ルールのファイル名>.jsonl`：1行に1対を書く。項目は次のとおり
  - `id`：ルールIDと連番
  - `rule_id`：対象のルールID
  - `violation`、`fixed`：違反した文と、直した文
  - `basis`：手がかりにした出典の箇所
  - `author`：書いたモデルか人
  - `reviewed_by`：ラベルを確かめた人か、AIで点検したときはそのモデル（`claude-opus-5-5`）。人が確かめたら人の名前に替える。確かめる前は`null`にする
- 文は、出典の例を手がかりにして書き下ろす。出典の文章は写さない
- 文は、見出し1の後ろに置いて採点する。見出し1で始まる文は、文書全体としてそのまま採点する
- 直した文は、どのルールにも違反しない文として書く。直した文で出た指摘は、すべて誤検出として数える
- `corpus/known.json`の理由は、次の三つの書き出しで分ける
  - 「見逃し：」：ルールが対象にしているのに、判定手段が拾わない
  - 「AI評価の範囲：」：ルールの注記で、機械の判定の外にしている部分
  - 「要確認：」：違反とするかどうかを、人が決める

`corpus/human/`には、人が書いて公開された文書の段落を置く。ルールを知らない書き手の文で、誤検出を測るためである。

- `corpus/human/<出典>.jsonl`：1行に1段落を書く。項目は次のとおり
  - `id`：出典の略号と連番（`DGJ-001`）
  - `text`：段落の文。出典の文言を変えない
  - `source`：出典のページの名前（`title`）、作成元（`publisher`）、URL（`url`）、取得した日（`retrieved`）
  - `findings`：段落を採点したときの指摘と、その判断。指摘は判定手段（`checker`）、桁（`column`）、該当箇所（`excerpt`）で見分ける
  - `reviewed_by`：判断を確かめた人か、AIで点検したときはそのモデル。書き方は対の文と同じにする
- `findings`の`label`は、次の四つのどれかにする。「違反」以外は、`reason`に理由を書く
  - 「違反」：段落が、そのルールの文言どおりに違反している
  - 「誤検出」：ルールの文言に照らして違反でない。または、別のルールの違反を、このルールのIDで出している
  - 「ルール外」：どのルールにも対応しない判定の指摘。#74で、どの判定もルールに対応させたため、今は使っていない
  - 「要確認」：違反とするかどうかを、人が決める
- 採点で出た指摘が`findings`と一致しないと、テストが失敗する。採点を直したら、出た指摘を判断して`findings`を直す
- 使える資料は、README.mdの「利用条件」に挙げたものに限る

ルールごとの検出率と誤検出の数は、`node tests/corpus/report.mjs`で表にして出せる。人が書いた段落については、`findings`の判断をルールごとに数える。
