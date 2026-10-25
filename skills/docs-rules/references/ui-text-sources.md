# UI文言の一次資料調査

文書種別「UI文言」（識別名`ui-text`）を足すために、Webの画面に出す文言の規約を調べた結果。対応Issueは#32で、実装は#33で行う。判断の軸（取り込み方、担当する層、ライセンスの扱い）は[reference-sources.md](reference-sources.md)と同じにする。

調査日は2026-10-24。複数の観点でWebを検索し、取り出した主張ごとに3票で反証を試み、2票以上で否定されたものを捨てた。デジタル庁デザインシステムは、配布されているMarkdown版（2026年10月21日版）の本文も確かめた。

## 調査結果一覧

候補ごとの採否と取り込み方は次のとおり。

| 候補 | 採用 | 取り込み方 | ライセンス | 担当する層 |
| --- | --- | --- | --- | --- |
| デジタル庁デザインシステム | 採用 | rules | 公共データ利用規約（PDL1.0、CC BY 4.0互換） | 文体・内容 |
| Atlassian Design SystemのContent | 参照のみ | 参照のみ | 未確認 | 内容 |
| Shopify PolarisのContent guidelines | 参照のみ | 参照のみ | 未確認。リポジトリはアーカイブ済み | 内容 |
| Microsoftの「Writing style - Windows apps」と「Error message guidelines」 | 参照のみ | 参照のみ | 未確認 | 内容 |
| Google Material Design、Apple Human Interface Guidelines、GOV.UK、Nielsen Norman Group | 未決定 | なし | 未確認 | なし |
| 公用文作成の考え方、JTF日本語標準スタイルガイド | 採用済み（#1） | 共通ルールの例外を決めるときに参照 | [reference-sources.md](reference-sources.md)を参照 | 表記・文体 |

## 候補ごとの判断

### デジタル庁デザインシステム

- 判断：採用。日本語のUI文言について、本文を書き直して載せられる唯一の資料である
- 中身：文言だけを扱う独立したページはない。文言の決まりは、各コンポーネントと基本要素のページに分かれて書かれている。見つけた記述は下の表のとおり
- ライセンス：サイトの「ご利用にあたって」が、デジタル庁ウェブサイトのコピーライトポリシーに従うとしている。ポリシーはPDL1.0を適用し、PDL1.0は翻案と商用利用を認め、CC BY 4.0と互換がある
- 条件：出典を書く。編集・加工したことを、出典とは別に書く。加工したものをデジタル庁が作ったように見せない。MITのLICENSEはこの表示を運ばないため、取り込むルールの「出典」欄と、README.mdの利用条件の表に書く
- 対象外：Figmaのデータ（CC BY 4.0）、アイコン（Apache 2.0）、コードスニペット（MIT）、ロゴは別の条件である。文言のルールには使わない

文言の決まりが書かれているページは次のとおり。

| ページ | 書かれていること |
| --- | --- |
| 入力フィールド（`components/input-text`） | プレースホルダーは原則として使わない。入力の条件や例は、入力欄の下のサポートテキストに書く |
| ボタン（`components/button`） | ボタンを無効にするときは、近くに理由か有効にする方法を書く |
| ディスクロージャー（`components/disclosure`） | タイトルは短く内容を表すものにし、操作を促す言い方にしない。開閉の状態でラベルを変えない |
| ノティフィケーションバナー（`components/notification-banner`） | バナーを閉じる操作は専用の部品で行い、「閉じる」というアクションボタンを作らない |
| 緊急時バナー（`components/emergency-banner`） | タイトルはモバイルで2行に収まる全角30字程度、本文は全角100字程度を目安にする |
| リンクテキスト（`foundations/link-text`） | 「ここをクリック」のようなリンク先の分からない文言を使わない（WCAG 2.1の失敗例F84） |
| テキストエリア（`components/textarea`） | ラベルの例に「どの機能に問題がありましたか？」のような問いの形がある |

### 英語の資料（Atlassian、Shopify Polaris、Microsoft）

- 判断：参照のみ。要素ごとの型（エラー、空の状態、ボタン）の根拠として、名前とURLだけを挙げる。考え方を日本語で書き下ろし、原文は置かない
- 3資料で一致した点：エラーは「何が起きたか」「利用者への影響」「利用者がすること」を短く示し、利用者を責めない
- 空の状態：空である理由と次の行動を1〜2文で示す。タイトルの繰り返しを避ける（Atlassian）。タイトルは機能名の名詞ではなく、利用者がすることを書く（Polaris）
- ボタン：操作の結果を表す短い語にし、「OK」のような反応の語で済ませない。英語の「動詞で始める」は、日本語では「動作を表す語で終える」（「注文を作成」）に置き換える
- 注意：Microsoftのエラーのガイドラインはデスクトップアプリ向けで、OKやYesを認めている。Polarisも共通の操作を例外にしている。このため「OK」「はい」を一律に禁じる根拠はない
- Polaris Reactは非推奨になり、文書のURLはリダイレクトされる。根拠にはGitHubのアーカイブを使うため、将来消える危険がある

### 未決定の資料

- 次の4つは、検証を通った主張が残らなかった。採否と利用条件は、#33の着手前に改めて調べる
  - Google Material Design
  - Apple Human Interface Guidelines
  - GOV.UK（Open Government Licence）
  - Nielsen Norman Group
- 視点のルール（機能の説明ではなく、利用者ができることで書く）は、根拠にした主張が検証で否定された。出典がないため、ルールに入れるかは#33で決める

## ルール候補

IDの接頭辞は`UI-`を仮に使う。採否と最終のIDは#33で決める。

| ID候補 | ルール | 判定 | 出典 |
| --- | --- | --- | --- |
| UI-001 | エラーは、何が起きたか、影響、利用者がすることを1〜2文で書き、利用者を責めない | AI（文の数は機械） | Atlassian、Microsoft（参照のみ） |
| UI-002 | 空の状態は、空である理由と次の行動を1〜2文で示し、タイトルを繰り返さない | AI（文の数は機械） | Atlassian、Polaris（参照のみ） |
| UI-003 | 空の状態のタイトルは、機能名ではなく利用者がすることを書く | AI | Polaris（参照のみ） |
| UI-004 | ボタンは操作の結果を表す語で書く。確認の画面では「OK」「はい」より、問いに答える具体的な語を優先する | AI | Microsoft、Atlassian、Polaris（参照のみ） |
| UI-005 | プレースホルダーを使わず、入力の条件と例はサポートテキストに書く | 機械（文言表のプレースホルダー欄が空か） | デジタル庁デザインシステム |
| UI-006 | ボタンを無効にするときは、理由か有効にする方法を近くに書く | AI | デジタル庁デザインシステム |
| UI-007 | 開閉する要素のラベルを、状態に応じて変えない | 機械（「開く」「閉じる」で終わるラベルの検出）とAI | デジタル庁デザインシステム |
| UI-008 | 開閉する要素のタイトルは短く内容を表し、操作を促す言い方にしない | AI | デジタル庁デザインシステム |
| UI-009 | 要素ごとに文字数の上限を決め、文言表に書く | 機械 | デジタル庁デザインシステム（緊急時バナーの30字と100字を例にする） |
| UI-010 | 機能の説明（「〜する機能です」「本画面では」）ではなく、利用者ができることで書く | AI（言い回しの一部は機械） | 未確定 |

リンクテキストの決まりは、共通ルールのMKD-010と同じ内容である。UI文言の種別では新しく足さず、MKD-010の出典にデジタル庁デザインシステムを加える案を#33に渡す。

## 共通ルールの例外候補

共通ルールを直さず、UI文言の種別の例外として扱う案を挙げる。

| 共通ルール | UI文言での扱いの案 | 根拠 |
| --- | --- | --- |
| NOT-003（「！」「？」を使わない） | 問いの形のラベル（「どの機能に問題がありましたか？」）に限り「？」を認める | デジタル庁デザインシステムのテキストエリアの例 |
| NOT-002、GRM-016（句点） | ラベル、ボタン、タイトルには句点を付けない。2文以上のメッセージには付ける | 未確定。GRM-017（図表の中の文）と同じ考え方を当てはめる案 |
| GRM-001（常体と敬体を混ぜない） | 文書全体ではなく、要素の種類ごとにそろえる。ラベルとボタンは体言止めか動詞の終止形、メッセージは敬体 | 未確定 |
| GRM-003（三つ以上の項目は箇条書） | 1行の文言には当てはめない | 未確定 |

## 文言表の必須セクション候補

画面、要素、文言、根拠を並べる文言表（コピーデッキ）を1つの文書として扱う案である。個々の節を直接定めた資料は見つかっていないため、上のルール候補から組み立てた。

| 順 | 見出し名の候補 | 役割 |
| --- | --- | --- |
| 1 | 対象の画面 | 文言を載せる画面の一覧と、各画面の目的 |
| 2 | 用語表 | 同じ対象に使う語を1つに決める |
| 3 | 文言 | 画面ごとに、要素の種類、文言、文字数の上限、従ったルールIDを並べる |
| 4 | エラーと空の状態 | 状態ごとに、何が起きたか、影響、利用者がすることを列に分けて書く |
| 5 | 未決定の文言 | 決まっていない文言と、決める人 |

## 出典

- [デジタル庁デザインシステム](https://design.digital.go.jp/dads/)
- [デジタル庁デザインシステム『ご利用にあたって』](https://design.digital.go.jp/introduction/notices/)
- [デジタル庁デザインシステム『リソース』（Markdown版の配布）](https://design.digital.go.jp/dads/resources/)
- [デジタル庁『コピーライトポリシー』](https://www.digital.go.jp/copyright-policy)
- [デジタル庁『公共データ利用規約（第1.0版）』](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0)
- [Atlassian Design System『Error messages』](https://atlassian.design/foundations/content/designing-messages/error-messages)
- [Atlassian Design System『Empty state』](https://atlassian.design/foundations/content/designing-messages/empty-state)
- [Shopify Polaris『Empty state』（GitHubのアーカイブ）](https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/layout-and-structure/empty-state.mdx)
- [Microsoft Learn『Writing style - Windows apps』](https://learn.microsoft.com/en-us/windows/apps/design/style/writing-style)
- [Microsoft Learn『Error message guidelines』](https://learn.microsoft.com/en-us/windows/win32/debug/error-message-guidelines)
- [W3C『F84: Failure of Success Criterion 2.4.9』（WAIC訳）](https://waic.jp/translations/WCAG21/Techniques/failures/F84)
