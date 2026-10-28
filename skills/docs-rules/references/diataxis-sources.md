# Diátaxisの4分類の一次資料調査

Diátaxisの4分類（チュートリアル、ハウツー、リファレンス、解説）を、汎用の文書種別として足すための調査結果。対応Issueは#55で、実装も#55で1種別ずつ行う。判断の軸（取り込み方、担当する層、ライセンスの扱い）は[reference-sources.md](reference-sources.md)と同じにする。

調査日は2026-10-28。各資料の本文とライセンスの表示を、公式のページとリポジトリで直接確かめた。#30と#32の調査と違い、主張ごとに3票で反証を試みる手順は取っていない。

4分類の軸と、既存の種別の位置づけは[schemas/README.md](../schemas/README.md)の「文書種別の決め方」にすでに書いてある。ここでは、種別ごとの必須セクションを決める材料を集めた。

## 調査結果一覧

候補ごとの採否と取り込み方は次のとおり。

| 候補 | 採用 | 取り込み方 | ライセンス | 担当する層 |
| --- | --- | --- | --- | --- |
| Diátaxis（4分類の各ページ） | 採用済み（#15） | 参照のみ（考え方を書き直す） | CC BY-SA 4.0（GitHubリポジトリのREADMEに記載） | 構成 |
| The Good Docs Projectのテンプレート | 採用 | schemas、templates | MIT No Attribution（MIT-0） | 構成 |
| Google Developer Documentation Style Guide | 採用済み（#1） | schemas | CC BY 4.0 | 構成 |
| MADR（Markdown Architectural Decision Records） | 採用 | schemas（ADRを扱う場合） | MIT OR CC0-1.0 | 構成 |
| Red Hatのモジュラードキュメントの手引き | 参照のみ | 参照のみ | CC BY-SA 4.0 | 構成 |
| GitLabのドキュメントのトピックタイプ | 参照のみ | 参照のみ | CC BY-SA 4.0 | 構成 |
| JIS Z 82079-1:2026（製品の使用説明の作成） | 参照のみ | 参照のみ | 規格の本文は有償。JISCでは閲覧だけができる | 構成・内容 |

## 候補ごとの判断

### Diátaxis

- 判断：採用済み。4分類の枠組みと、各分類の書き方の原則の根拠にする。CC BY-SA 4.0のため、文章は置かず、考え方を書き直す
- ライセンス：GitHubリポジトリ（evildmp/diataxis-documentation-framework）のREADMEに、CC BY-SA 4.0と書いてある。2026-10-28に改めて確かめた
- チュートリアル：学ぶための体験で、作業を終えることが目的ではない。到達点を最初に示し、目に見える結果を早く頻繁に出す。説明は最小限にし、選択肢や代替案を扱わない。何度たどっても同じ結果が得られるように作る
- ハウツー：読み手の目的を果たすための手順で、道具の使い方ではなく目的で書く。読み手は何をしたいかを分かっている前提に立つ。説明や網羅的な参照は入れず、リンクで済ませる。手順は論理的な順に並べ、「Xが要るならYをする」のような条件付きの指示も使う
- ハウツーの題名：何をするための手順かが題名だけで分かるようにする。「〜する方法」の形がよく、名詞だけの題名は、判断、手順、説明のどれか分からない
- リファレンス：事実を記述することだけに徹し、説明、指示、意見を混ぜない。構成は製品の構造に合わせる。決まった型で一貫させ、用例を添える
- 解説：理解のための文書で、手順やリファレンスを混ぜない。背景、設計の判断、歴史的な経緯、制約を示し、ほかの考え方との比較や意見も認める。題名は「〜について」の形で読めるものにする
- 名前：解説の文書は、背景、議論、概念のガイドなど、「解説」以外の名前で呼んでもよい

### The Good Docs Project

- 判断：採用。テンプレートの見出しの並びを、必須セクションの候補の主な根拠にする
- ライセンス：テンプレートのリポジトリ（gitlab.com/tgdp/templates）はMIT No Attributionである。改変と再配布を制限なく認め、著作権表示も求めない。出典は、たどれるように出典の欄に書く
- サイトのページ（thegooddocsproject.dev）は「All Rights Reserved unless otherwise stated」で、テンプレートとは条件が違う。根拠にはリポジトリのテンプレートだけを使う
- 基本のテンプレート（Core pack）は、Concept、How-to、README、Reference、Release notes、Troubleshooting、Tutorialの7種である

テンプレートごとの見出しの並びは次のとおり。（任意）は、テンプレートが任意と明記した見出しである。

| テンプレート | 見出しの並び |
| --- | --- |
| How-to | Overview、Before you start（任意）、{作業名}、See also |
| Tutorial | Overview、Background（任意）、Before you start、{作業名}、Summary、Next steps |
| Reference | {参照する対象の説明}、{表などの構造化した項目}、Commands（任意） |
| Concept | 見出しなしの要約と定義、Background（任意）、Use cases、Comparison（任意）、Related resources（任意） |

- How-toとTutorialの手順は、どちらも番号付きの箇条書で、各手順を動詞で始める。手順の下に、説明、コード例、手順の結果を任意で添える
- TutorialのOverviewは、対象の読み手、前提とする知識、学習の目標（終えたときにできること）を示す
- Referenceの表は、参照元の資料と同じ順に並べる。列の例は「項目、説明、例」である

### Google Developer Documentation Style Guide

- 判断：採用済み。[schemas/README.md](../schemas/README.md)の「Googleのガイドから取る観点」を、4種別にも当てはめる
- 手順（Procedures）：手順の前に、目的と必要なものを示す。一つの手順には一つの動作だけを書く。順に行う手順は番号付きの箇条書にする

### MADR

- 判断：採用。解説の種別でADR（設計の決定の記録）を扱う場合の根拠にする
- ライセンス：リポジトリ（adr/madr）は、MITとCC0-1.0のどちらかを選べる二重ライセンスである
- 最小のテンプレートの見出しは、次の順である。Consequencesは、Decision Outcomeの下の見出しである
  1. Context and Problem Statement
  2. Considered Options
  3. Decision Outcome
- 題名には、解いた問題と選んだ解決策が分かる短い文を付ける

### Red HatとGitLab

- 判断：参照のみ。どちらもCC BY-SA 4.0のため、文章は置かず、名前とURLだけを挙げる
- Red Hatのモジュラードキュメント：モジュールをconcept、procedure、referenceの三つに分ける。procedureの必須は、題名、短い導入、手順である。任意で、前提条件、結果の確認、トラブルシューティング、次の手順、関連資料を、この順に置く
- Red Hatのreferenceモジュール：本文を表や箇条書の厳密な構造にし、五十音順のような論理的な順に並べる
- GitLabのトピックタイプ：concept、task、reference、troubleshootingの四つに分ける。チュートリアルはページの型として別に扱う。1〜2文しかないトピックや、ほかのページへのリンクだけのページを作らない
- GitLabの見出し：conceptの見出しに「Overview」「Introduction」を使わない。上位の見出しの語を繰り返さない

### JIS Z 82079-1

- 判断：参照のみ。製品の使用説明を作るときの日本の規格で、IEC/IEEE 82079-1:2019に対応する
- 版：JISCのデータベースで、2026年8月20日に制定されたと確かめた。旧規格のJIS C 0457は、廃止が提案されている
- 本文は有償で、JISCでの閲覧にはログインが要る。日本規格協会のプレビューは、サイトが緊急メンテナンス中のため読めなかった。情報の種類（概念、手順、参照）をどう定めているかは確かめていない

## 4種別の必須セクションの候補

識別名と見出し名は案で、決定は実装で行う。見出しは、資料に共通する並びを日本語の文書に合わせて組み直した。

### ハウツー（`how-to`）

| 順 | 見出し名の候補 | 役割 | 根拠 |
| --- | --- | --- | --- |
| 1 | `## 目的` | 何を達成するための手順か、どんなときに使うかを示す | Good Docs（Overview）、Diátaxis |
| 2 | `## 前提` | 始める前に要る権限、環境、済ませておく作業を示す。ない場合はその旨を一文で書く | Good Docs（Before you start）、Google、Red Hat |
| 3 | `## 手順` | 番号付きの箇条書で、一つの手順に一つの動作を書く | Good Docs、Google、Red Hat |
| 4 | `## 結果の確認` | 手順が終わったことを、読み手がどう確かめるかを示す | Red Hat（Verification）。Good Docsは手順ごとの結果として任意 |
| 5 | `## 関連文書` | 関連する手順、解説、リファレンスへのリンクを並べる | Good Docs（See also）、Red Hat（Additional resources） |

### チュートリアル（`tutorial`）

| 順 | 見出し名の候補 | 役割 | 根拠 |
| --- | --- | --- | --- |
| 1 | `## 学ぶこと` | 対象の読み手と、終えたときにできるようになることを示す | Good Docs（Overview）、Diátaxis |
| 2 | `## 準備` | 前提とする知識と、用意する道具や環境を示す | Good Docs（Before you start） |
| 3 | `## 手順` | 一本道の手順を番号付きで並べ、各手順の後に期待する結果を示す | Good Docs、Diátaxis |
| 4 | `## まとめ` | 学んだことを並べる | Good Docs（Summary） |
| 5 | `## 次に読む文書` | 続けて取り組める文書を並べる | Good Docs（Next steps） |

### リファレンス（`reference`）

| 順 | 見出し名の候補 | 役割 | 根拠 |
| --- | --- | --- | --- |
| 1 | `## 対象` | 何についての参照情報か、どの版や範囲を扱うかを示す | Good Docs、Red Hat（短い導入） |
| 2 | `## 一覧` | 項目を表か箇条書で、決まった型と順で並べる | Good Docs、Red Hat、Diátaxis |
| 3 | `## 使用例` | 代表的な使い方を、説明を加えずに示す | Diátaxis（Provide examples）、Good Docs（Commands の Example 列） |
| 4 | `## 関連文書` | 手順や解説の文書へのリンクを並べる | Diátaxis、Red Hat |

- リファレンスは、対象によって本文の型（設定項目、コマンド、APIなど）が大きく変わる。必須セクションは最小限にし、`## 一覧`の中の`###`以下を自由にする案である

### 解説（`explanation`）

| 順 | 見出し名の候補 | 役割 | 根拠 |
| --- | --- | --- | --- |
| 1 | `## 要旨` | 何について説明するかと、その要点を示す | Good Docs（冒頭の要約）、Diátaxis |
| 2 | `## 背景` | 経緯、制約、前提となる事情を示す | Diátaxis（Provide context）、Good Docs（Background） |
| 3 | `## 考え方` | 設計の判断や方針と、その理由を示す | Diátaxis |
| 4 | `## ほかの選択肢との比較` | ほかの考え方や案と比べ、選ばなかった理由を示す | Diátaxis（Admit opinion and perspective）、Good Docs（Comparison）、MADR（Considered Options） |
| 5 | `## 関連文書` | 手順やリファレンスの文書へのリンクを並べる | Good Docs（Related resources） |

## 種別の境目

隣り合う種別は混ざりやすい。各種別の`## 目的と読み手`に、次の境目を書く案である。

| 種別の組 | 境目 | 根拠 |
| --- | --- | --- |
| チュートリアルとハウツー | チュートリアルは学ぶための一本道で、選択肢を扱わない。ハウツーは目的を果たすための手順で、読み手の状況による分岐を扱う | Diátaxis |
| ハウツーとリファレンス | ハウツーは行動の順に並べる。リファレンスは製品の構造の順に並べ、指示を書かない | Diátaxis、Red Hat |
| リファレンスと解説 | リファレンスは事実だけを書く。理由、経緯、意見は解説に回す | Diátaxis |
| 解説と提案書 | 解説は理解のための文書で、決定を求めない。読み手に決定を求める文書は提案書にする | [schemas/README.md](../schemas/README.md)の「既存の種別の位置づけ」 |

## 文書全体の制約の候補

- 題名：ハウツーは「〜する方法」「〜する手順」の形にし、何をする手順かを題名だけで分かるようにする（Diátaxis）。解説は「〜について」と読める題名にする（Diátaxis）
- 混ぜない：説明が要る箇所は、本文に書かず、解説の文書へのリンクにする（Diátaxis、Good Docs）
- 手順の書き方：一つの手順に一つの動作を書き、動作を表す語で書く（Google、Good Docs）
- 短すぎる文書：1〜2文で終わる文書は、ほかの文書に統合する（GitLab）

## 決めること

- 識別名と見出し名：上の候補は案である。実装の最初の種別（`how-to`）で決める
- ADRの扱い：Issueの例に挙げたADRを、解説の種別に含めるか、別の種別にするか。MADRの見出しは、決定の記録の性格が強い。セッションログの「決めたこと」「決めた理由」とも重なる
- トラブルシューティング：Good Docs、Red Hat、GitLabは独立した型として扱うが、Diátaxisの4分類にはない。ハウツーに含めるか、種別を足さないかを決める
- 自動生成のリファレンス：APIの仕様のように自動生成する文書を、リファレンスの種別の対象にするか
- `## 結果の確認`：ハウツーで必須にするか。Red Hatでは任意、Good Docsでは手順ごとの任意の項目である

## 出典

- [Diátaxis『Tutorials』](https://diataxis.fr/tutorials/)
- [Diátaxis『How-to guides』](https://diataxis.fr/how-to-guides/)
- [Diátaxis『Reference』](https://diataxis.fr/reference/)
- [Diátaxis『Explanation』](https://diataxis.fr/explanation/)
- [evildmp/diataxis-documentation-framework（ライセンス記載）](https://github.com/evildmp/diataxis-documentation-framework)
- [The Good Docs Project『Templates』](https://www.thegooddocsproject.dev/template)
- [The Good Docs Projectのテンプレートのリポジトリ](https://gitlab.com/tgdp/templates)
- [The Good Docs Projectのテンプレートのライセンス（MIT-0）](https://gitlab.com/tgdp/templates/-/blob/main/LICENSE)
- [Google Developer Documentation Style Guide『Procedures』](https://developers.google.com/style/procedures)
- [MADR](https://github.com/adr/madr)
- [Red Hat『Modular documentation reference guide』](https://redhat-documentation.github.io/modular-docs/)
- [redhat-documentation/modular-docs（ライセンス記載）](https://github.com/redhat-documentation/modular-docs)
- [GitLab『Documentation topic types (CTRT)』](https://docs.gitlab.com/development/documentation/topic_types/)
- [日本産業標準調査会『JISリスト』（JIS Z 82079）](https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?show&jisStdNo=Z82079)
