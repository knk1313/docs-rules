# UI文言の一次資料調査

文書種別「UI文言」（識別名`ui-text`）を足すために、Webの画面に出す文言の規約を調べた結果。対応Issueは#32で、実装は#33で行う。判断の軸（取り込み方、担当する層、ライセンスの扱い）は[reference-sources.md](reference-sources.md)と同じにする。

調査日は2026-10-24。複数の観点でWebを検索し、取り出した主張ごとに3票で反証を試み、2票以上で否定されたものを捨てた。デジタル庁デザインシステムは、配布されているMarkdown版（2026年10月21日版）の本文も確かめた。

2026-10-28に、#32のコメントに残した未確認の点を同じ方法で調べ直した。確かめたのは、英語の4資料（GOV.UK、Apple、Material Design 3、Nielsen Norman Group）の主張と、GOV.UKとAtlassianの利用条件である。日本語のUI文言の文字数の上限、句点、敬体と常体を定めた一次資料は、今回も見つからなかった。

同じ日に、Apple、Material Design 3、Nielsen Norman Groupの利用条件をブラウザーで確かめた。三つとも改変や転載を認めていないため、参照のみのままにする。

実装（Issue #33）では、次のとおりにした。

- ルールの置き場：[schemas/ui-text.md](../schemas/ui-text.md)の「文書全体の制約」に、UI-001〜UI-013をこの表のIDのまま置いた。`rules/`には置いていない
- 機械の判定：UI-001、UI-002、UI-005、UI-009〜UI-012は、`evaluators/schema-checks/ui-text.mjs`で判定する。`score.mjs`に`--type ui-text`を渡したときだけ動く
- UI-007：開閉の見出しを見分けられないため、AIの判定にした
- 文言表の必須セクション：下の候補の5セクションを、見出し名のまま使った
- NOT-003の例外：問いの形のラベルの「？」は、採点の結果から外す
- MKD-010：出典にデジタル庁デザインシステムのリンクテキストを加えた

## 調査結果一覧

候補ごとの採否と取り込み方は次のとおり。

| 候補 | 採用 | 取り込み方 | ライセンス | 担当する層 |
| --- | --- | --- | --- | --- |
| デジタル庁デザインシステム | 採用 | rules | 公共データ利用規約（PDL1.0、CC BY 4.0互換） | 文体・内容 |
| Atlassian Design SystemのContent | 参照のみ | 参照のみ | 独自のライセンス。改変と第三者への配布を禁じる | 内容 |
| Shopify PolarisのContent guidelines | 参照のみ | 参照のみ | 未確認。リポジトリはアーカイブ済み | 内容 |
| Microsoftの「Writing style - Windows apps」と「Error message guidelines」 | 参照のみ | 参照のみ | 未確認 | 内容 |
| GOV.UK Service ManualとGOV.UK Design System | 採用 | 考え方を日本語で書き下ろす | Open Government Licence v3.0（翻案を認め、出典の表示が要る） | 内容・表記 |
| Apple Human Interface GuidelinesのWriting | 参照のみ | 参照のみ | Apple Website Terms of Use。書面の同意なく複製、翻訳、配布ができない | 内容 |
| Google Material Design 3のUX writing best practices | 参照のみ | 参照のみ | Google利用規約だけで、オープンライセンスの表示はない | 内容 |
| Nielsen Norman Group『Error-Message Guidelines』 | 参照のみ | 参照のみ | 全著作権を留保。転載と翻訳は有償で、短い引用とリンクだけ自由 | 内容 |
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
- Atlassianのライセンス（2025年3月13日更新）は、文書を含むサイト全体に及ぶ独自のライセンスである。改変、二次的著作物の作成、第三者への配布を禁じるため、文章を書き直して載せることもできない。名前とURLを挙げるだけにする

### GOV.UK

- 判断：採用。Service ManualとDesign Systemのフッターに、別に記したものを除き、すべての内容をOpen Government Licence v3.0で使えるとある。ロイヤルアームズ、省庁のロゴ、第三者の素材は対象外である
- 扱い：英語の資料のため、考え方を日本語で書き下ろし、原文は置かない。ルールに取り込むときは、出典の表示をREADME.mdの利用条件の表にも足す
- 句読点：見出しと入力欄のラベルには句読点を付けない。それ以外の文言は完全な文で書き、文末にピリオドを打つ（Writing for user interfaces、2018年4月更新）。ボタンについては書いていない
- エラー：平易な言葉で、肯定的に、要点だけを書く。何が起きたかと直し方を示し、技術用語と「An error occurred」のような汎用の文言を避ける
- エラーで使わない語：「please」（選ぶ余地があるように聞こえる）、「sorry」（解決の役に立たない）、「valid」「invalid」（何も伝えない）、「oops」のようなくだけた語

### Apple、Material Design 3、Nielsen Norman Group

主張の中身と、サイトの利用条件を一次資料で確かめた。三つとも参照のみとし、名前とURLだけを挙げる。

- Appleの利用条件：HIGのページのフッターは、apple.comのWebsite Terms of Use（2009年11月20日更新）を指す。書面による事前の同意がなければ、内容の複製、転載、翻訳、配布はできない。ロボットなどによる自動の取得も禁じている
- Material Design 3の利用条件：フッターにはGoogleの利用規約とプライバシーポリシーへのリンクだけがあり、Creative Commonsなどの表示はない
- Nielsen Norman Groupの利用条件：記事の全著作権を留保している。ほかのサイトへの転載と翻訳には、1記事250ドルの使用料が要る。数語から数行の引用と、記事へのリンクは許可なしにできる

- Apple HIGのWriting：ボタンとリンクのラベルには、ほぼ常に動詞を使う。エラーは問題の箇所の近くに出し、利用者を責めず、直し方を示す。例は、パスワードが短すぎると伝えるより、8文字以上のパスワードを選ぶよう伝える、である。「oops!」のような感嘆詞と、「Invalid name」のような情報のない文言は避ける。このページには「OK」を避けるという記述はない
- Material Design 3のUX writing best practices：操作の結果を、中立かつ直接的な言葉で伝える。何が起き、どう元に戻せるかを示し、不安をあおる警告を避ける。タイトルやボタンを含むすべての文言をsentence caseで書くとするが、英語の大文字の規則のため日本語には当てはめない
- Nielsen Norman Groupの『Error-Message Guidelines』（2023年5月）：人が読める言葉を使い、技術用語を避ける。エラーコードは診断に要るときだけ示す。問題を簡潔かつ正確に書き、汎用の文言を避け、直し方を前向きに示す

### 未決定の点

- 視点のルール（機能の説明ではなく、利用者ができることで書く）は、根拠にした主張が検証で否定された。今回の調査でも、この原則を明文化した一次資料は見つからなかった
- 確認の画面のボタンで「OK」「はい」を避けるとする一次資料は見つからなかった。Apple HIGの「ボタンは動詞」は、動詞を勧めるだけで「OK」を禁じていない
- 2026-10-28に、UI-004、UI-009、UI-010は、一次資料がないままルールに入れると決めた。出典の欄には、一次資料がないことと、参照のみの資料を書く

## ルール候補

IDの接頭辞は`UI-`を仮に使う。採否と最終のIDは#33で決める。

| ID候補 | ルール | 判定 | 出典 |
| --- | --- | --- | --- |
| UI-001 | エラーは、何が起きたか、影響、利用者がすることを1〜2文で書き、利用者を責めない | AI（文の数は機械） | GOV.UK、Apple、Nielsen Norman Group、Atlassian、Microsoft（GOV.UK以外は参照のみ） |
| UI-002 | 空の状態は、空である理由と次の行動を1〜2文で示し、タイトルを繰り返さない | AI（文の数は機械） | Atlassian、Polaris（参照のみ） |
| UI-003 | 空の状態のタイトルは、機能名ではなく利用者がすることを書く | AI | Polaris（参照のみ） |
| UI-004 | ボタンは操作の結果を表す語で書く。確認の画面では「OK」「はい」より、問いに答える具体的な語を優先する | AI | Apple、Microsoft、Atlassian、Polaris（参照のみ） |
| UI-005 | プレースホルダーを使わず、入力の条件と例はサポートテキストに書く | 機械（文言表のプレースホルダー欄が空か） | デジタル庁デザインシステム |
| UI-006 | ボタンを無効にするときは、理由か有効にする方法を近くに書く | AI | デジタル庁デザインシステム |
| UI-007 | 開閉する要素のラベルを、状態に応じて変えない | 機械（「開く」「閉じる」で終わるラベルの検出）とAI | デジタル庁デザインシステム |
| UI-008 | 開閉する要素のタイトルは短く内容を表し、操作を促す言い方にしない | AI | デジタル庁デザインシステム |
| UI-009 | 要素ごとに文字数の上限を決め、文言表に書く | 機械 | デジタル庁デザインシステム（緊急時バナーの30字と100字を例にする） |
| UI-010 | 機能の説明（「〜する機能です」「本画面では」）ではなく、利用者ができることで書く | AI（言い回しの一部は機械） | 一次資料なし。入れると決めた |
| UI-011 | エラーを「エラーが発生しました」「入力が正しくありません」のような汎用の文言で済ませず、何が違うかと直し方を書く | AI（汎用の文言は機械） | GOV.UK、Apple、Nielsen Norman Group（GOV.UK以外は参照のみ） |
| UI-012 | エラーに感嘆の語（「おっと」）や、解決に役立たない謝罪の言葉を入れない | 機械（語の一覧）とAI | GOV.UK、Apple（Appleは参照のみ） |
| UI-013 | 取り消せない操作の確認では、何が起き、元に戻せるかを中立の言葉で示す | AI | Material Design 3（参照のみ） |

リンクテキストの決まりは、共通ルールのMKD-010と同じ内容である。UI文言の種別では新しく足さず、MKD-010の出典にデジタル庁デザインシステムを加える案を#33に渡す。

## 共通ルールの例外候補

共通ルールを直さず、UI文言の種別の例外として扱う案を挙げる。

| 共通ルール | UI文言での扱いの案 | 根拠 |
| --- | --- | --- |
| NOT-003（「！」「？」を使わない） | 問いの形のラベル（「どの機能に問題がありましたか？」）に限り「？」を認める | デジタル庁デザインシステムのテキストエリアの例 |
| NOT-002、GRM-016（句点） | ラベル、ボタン、タイトルには句点を付けない。2文以上のメッセージには付ける | GOV.UK（見出しとラベルには句読点を付けず、ほかは文末にピリオドを打つ）。英語の資料だが、日本語の一次資料がないまま入れると決めた。GRM-017（図表の中の文）と同じ考え方でもある |
| GRM-001（常体と敬体を混ぜない） | 文書全体ではなく、要素の種類ごとにそろえる。ラベルとボタンは体言止めか動詞の終止形、メッセージは敬体 | 一次資料なし |
| GRM-003（三つ以上の項目は箇条書） | 1行の文言には当てはめない | 一次資料なし |

2026-10-28に、GRM-001とGRM-003の例外は、一次資料がないまま入れると決めた。

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
- [GOV.UK Service Manual『Writing for user interfaces』](https://www.gov.uk/service-manual/design/writing-for-user-interfaces)
- [GOV.UK Design System『Error message』](https://design-system.service.gov.uk/components/error-message)
- [Apple『Human Interface Guidelines: Writing』](https://developer.apple.com/design/human-interface-guidelines/writing)
- [Material Design 3『UX writing best practices』](https://m3.material.io/foundations/content-design/style-guide/ux-writing-best-practices)
- [Nielsen Norman Group『Error-Message Guidelines』](https://www.nngroup.com/articles/error-message-guidelines/)
- [Atlassian Design System『License』](https://atlassian.design/license)
- [Apple『Website Terms of Use』](https://www.apple.com/legal/internet-services/terms/site.html)
- [Google『利用規約』](https://policies.google.com/terms)
- [Nielsen Norman Group『Copyright and Reprint Information』](https://www.nngroup.com/copyright-and-reprint-info/)
- [Atlassian Design System『Error messages』](https://atlassian.design/foundations/content/designing-messages/error-messages)
- [Atlassian Design System『Empty state』](https://atlassian.design/foundations/content/designing-messages/empty-state)
- [Shopify Polaris『Empty state』（GitHubのアーカイブ）](https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/layout-and-structure/empty-state.mdx)
- [Microsoft Learn『Writing style - Windows apps』](https://learn.microsoft.com/en-us/windows/apps/design/style/writing-style)
- [Microsoft Learn『Error message guidelines』](https://learn.microsoft.com/en-us/windows/win32/debug/error-message-guidelines)
- [W3C『F84: Failure of Success Criterion 2.4.9』（WAIC訳）](https://waic.jp/translations/WCAG21/Techniques/failures/F84)
