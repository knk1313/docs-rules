# prompts/

コードで判定できない品質をAIに評価させる手順と、見つかった違反を渡して書き直す手順を置く。評価の観点そのものは`rules/`と`schemas/`を正本とし、ここには手順と結果の形だけを書く。

| ファイル | 内容 |
| --- | --- |
| [evaluate.md](evaluate.md) | 書いた文書をAIで評価する手順と、評価結果の形式 |
| [rewrite.md](rewrite.md) | 採点と評価の違反を渡し、文書の該当箇所だけを書き直す手順 |

- 書き直しの指示は、評価と同じプロンプトに含めない。評価は書いた文書を読むだけにし、直すのは`rewrite.md`の手順で行う
- 書き直しを何回繰り返し、どこで止めるかは`SKILL.md`の「4. 点検してから出す」に書く
- このディレクトリの文章も[rules/](../rules/README.md)のルールに従う

## 評価する観点

AI評価で見る観点と、その正本、`rule_id`の書き方は次のとおり。

| 観点 | 正本 | `rule_id` |
| --- | --- | --- |
| `判定：AI`のルール | `rules/`の各ファイル（[rules/README.md](../rules/README.md)の「ファイルの分け方」の表） | ルールID（例：`FW-003`、`CMP-002`） |
| `判定：機械`のルールのうち、注記に「AI評価で扱う」とある部分 | 同上 | ルールID（例：`GRM-002`） |
| 文書種別ごとの必須セクションの中身と粒度の目安 | `schemas/<識別名>.md`の「セクションごとの書き方」 | `<識別名>#<見出し名>`（例：`proposal#背景と課題`） |
| 文書種別ごとの文書全体の制約 | `schemas/<識別名>.md`の「文書全体の制約」 | `<識別名>#文書全体の制約`（例：`journal-paper#文書全体の制約`） |

- 必須セクションの有無と順序は、`evaluators/score.mjs`が`SCHEMA`として採点する。AI評価では、各セクションの中身だけを見る
- `判定：機械`のルールの残りの部分は、`score.mjs`との重複を避けるため、AIでは評価しない

## 評価結果の形式

`evaluators/score.mjs`の採点結果と同じ形にする。項目の意味は[evaluators/README.md](../evaluators/README.md)の「採点結果の形式」を参照。AI評価で違うのは次の点である。

| 項目 | AI評価での値 |
| --- | --- |
| `violations[].judge` | `AI` |
| `violations[].checker` | `prompts/evaluate.md` |
| `violations[].line` | AIが数えた行番号。誤ることがあるため目安とする |
| `violations[].column` | `null` |
| `violations[].excerpt` | 必須。文書の文字列をそのまま写す。書き直し（[rewrite.md](rewrite.md)）は、この文字列で該当箇所を探す |
| `violations[].fix` | どの語をどう直すか、または何を足すかを具体的に書く。粒度の目安の違反では、足りない要素（件数、期日など）を名指しする |

- `checked_rules`には、評価した観点の`rule_id`をすべて入れる。`checked_rules`にあって`violations`に出なかった観点は合格である
- 文書に当てはまらない観点（読み手に日本語を母語としない人が含まれないときのCMP-006など）は、合格として扱い、`checked_rules`に入れる
- `skipped_rules`には、評価できなかった観点と理由を入れる（文書種別が決まらず粒度の目安を見られなかった、など）
