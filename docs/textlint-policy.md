# textlintのルールセットの使い方

`evaluators/`で表記・文体のルールを機械判定するとき、textlintの3プリセットをどう使うかを決めた記録。対応Issueは #13。開発者向けの判断の記録であり、スキルと一緒には配布しないため、`docs/`に置く。

- 対象：次の3プリセット
  - textlint-rule-preset-ja-technical-writing
  - textlint-rule-preset-jtf-style
  - textlint-rule-preset-ja-spacing
- 調査日：2026-10-22。ルールの一覧と既定値は、調査日に各リポジトリのREADMEとリリースページで確かめた
- `evaluators/`の設定ファイルとprh辞書は、この文書では置かない。#21で置く

## 決めた方針

textlintを依存パッケージとして使う。判定条件を写して自前で書くことはしない。

- `evaluators/`にtextlintの設定ファイルと、バージョンを固定した`package.json`を置く
- 実行は`npx`で行い、利用者に事前の`npm install`を求めない。スキル利用者の環境にNode.jsがある前提を置く
- 3プリセットにない語の置き換え（FW-001の言い換えの補い、NOT-008の仮名書き、NOT-016の「ヶ月」など）は、textlint-rule-prhの辞書（YAML）で判定する。辞書ファイルは#21で置く
- Node.jsがない環境では機械判定を飛ばす。Node.jsがないことを利用者に伝えたうえで、SKILL.mdの「4. 点検してから出す」の自己点検に戻る。処理は止めない
- プリセットのコードをリポジトリに写さないため、MITの著作権表示をリポジトリに残す作業は要らない

### 比べた案

| 案 | 長所 | 短所 |
| --- | --- | --- |
| 1. 依存パッケージとして使う（採用） | 自前で書くコードがほぼない。保守の続いているルールを使え、判定の精度を上げやすい。採点の実行環境がNode.jsにそろう | 利用者の環境にNode.jsが要る。初回の実行でnpmからパッケージを取得するため、ネットワークのない環境では動かない。既定値をdocs-rulesの基準に合わせる設定が要る |
| 2. 判定条件を参考にPythonで自前実装する | Node.jsが要らない。ルールIDと判定を1対1に書ける | 形態素解析が要るルール（GRM-004、GRM-005）の実装量が大きい。形態素解析器の導入が要り、追加インストールは減らない。写す範囲によってはMITの著作権表示が要る |
| 3. textlintを任意とし、自前実装と併用する | Node.jsがない環境でも一部の判定が動く | 同じルールの判定を2通り保守することになり、結果がずれる。採点結果の形式を2系統から合わせる処理も要る |

案1を選んだ理由は次のとおり。

- Issueの制約「利用者側の追加インストールを最小にする」に対し、`npx`で実行すれば利用者が入れるものはNode.jsだけになる
- 案2はNode.jsが要らない代わりに形態素解析器が要るため、追加インストールは減らない
- 自前で書く範囲が最も小さく、Issueの目的に合う

## 調べた版

| プリセット | 調査日に確かめた版 | 備考 |
| --- | --- | --- |
| preset-ja-technical-writing | v12.0.2（リリースページの最新） | Node.js 18以上が要る。preset-jtf-styleのv3を内部で使う |
| preset-jtf-style | v3.0.3（リリースページの最新） | READMEは、JTF日本語標準スタイルガイドの第2.2版（2016年2月22日改訂）を基にすると書いている。表のページ番号はv2.1、ライセンス欄は2.0を挙げており、版の記載はそろっていない |
| preset-ja-spacing | 未確認 | リリースページにリリースがない。npmの最新版は#21で`package.json`に固定するときに確かめる |

docs-rulesのJTFスタイルガイドの出典は第4.0版である。preset-jtf-styleの項目番号は第2.2版の番号のため、同じ項目でも第4.0版の番号と違う（対応は`rules/notation.md`の冒頭の注記を参照）。この文書ではプリセット側の番号で書く。`rules/`の`判定`欄にpreset-jtf-styleの項目を書くときの書式は、#12で`rules/README.md`に`jtf-style/<番号>.<項目名>`と決めた。

## 一覧の見方

プリセットの各ルールを、docs-rulesのルール（`skills/docs-rules/rules/`のFW・GRM・NOT）と照らして次の4区分に分けた。

| 区分 | 扱い |
| --- | --- |
| 重なる | 有効にする。docs-rulesの該当ルールの`判定`欄にtextlintのルール名を書く（すでに書いてあるものを含む） |
| 基準が違う | 設定でdocs-rulesの基準に合わせる。合わせられないものは無効にする |
| 食い違う | 無効にする |
| docs-rulesにない | docs-rulesのルールやリポジトリの書き方と食い違わないものは有効にする。`rules/`にルールとして足すかは別のIssueで決める |

- 二つのプリセットが同じことを判定するときは、一方だけを有効にして指摘の重複を避ける。ただし、docs-rulesの`判定`欄に両方の名前が書いてあるものは両方を有効にし、同じ箇所を重ねて指摘するかを#21で確かめてから一方を無効にする
- 基準が食い違うときは、#10で決めたとおり公用文作成の考え方を優先し、次にJTFスタイルガイドに従う
- 「既定」は、プリセットを入れただけのときに有効か無効かを示す

## preset-ja-technical-writing

全23ルール。既定ではすべて有効である。

| ルール | 既定値 | docs-rules | 区分 | 扱い |
| --- | --- | --- | --- | --- |
| sentence-length | 1文100字まで | GRM-002 | 基準が違う | 有効。GRM-002の上限は未定のため、#21で上限を決めて`max`を設定する |
| max-comma | 1文の「,」3個まで | なし | docs-rulesにない | 有効 |
| max-ten | 1文の読点3個まで | なし | docs-rulesにない | 有効。GRM-013（読点の位置）はAI判定で、数の上限は決めていない |
| max-kanji-continuous-len | 漢字の連続6字まで | なし | docs-rulesにない | 有効。誤検出の出る語は#21で`allow`に足す |
| arabic-kanji-numbers | 有効 | NOT-012、NOT-014 | 重なる | 有効。「一つ」「二つ」のような和語の数え方（NOT-014では漢数字）を算用数字に直すよう指摘するかは未確認のため、`判定`欄には書かない。指摘するなら無効にする |
| no-mix-dearu-desumasu | 本文は敬体、箇条書は常体を求める | GRM-001 | 基準が違う | 有効。GRM-001は常体と敬体のどちらでもよく、そろっていればよい。本文・見出し・箇条書の指定を自動判定（空文字）にする |
| ja-no-mixed-period | 文末の句点は「。」 | NOT-002 | 重なる | 有効 |
| no-double-negative-ja | 有効 | GRM-006 | 重なる | 有効 |
| no-dropping-the-ra | 有効 | なし | docs-rulesにない | 有効 |
| no-doubled-conjunctive-particle-ga | 有効 | GRM-004 | 重なる | 有効 |
| no-doubled-conjunction | 有効 | なし | docs-rulesにない | 有効 |
| no-doubled-joshi | 同じ助詞の間隔1 | GRM-005 | 重なる | 有効 |
| no-nfd | 有効 | なし | docs-rulesにない | 有効 |
| no-invalid-control-character | 有効 | なし | docs-rulesにない | 有効 |
| no-zero-width-spaces | 有効 | なし | docs-rulesにない | 有効 |
| no-exclamation-question-mark | 有効 | NOT-003 | 重なる | 有効 |
| no-hankaku-kana | 有効 | NOT-001 | 重なる | 有効 |
| ja-no-weak-phrase | 有効 | FW-004 | 重なる | 有効 |
| ja-no-successive-word | 有効 | なし | docs-rulesにない | 有効 |
| ja-no-abusage | 有効 | なし | docs-rulesにない | 有効。NOT-009（異字同訓）の一部と重なる語があるかは未確認 |
| ja-no-redundant-expression | 有効 | FW-001、FW-002 | 重なる | 有効 |
| ja-unnatural-alphabet | 有効 | なし | docs-rulesにない | 有効 |
| no-unmatched-pair | 有効 | なし | docs-rulesにない | 有効 |

## preset-jtf-style

実装のある項目だけを挙げる。辞書を使う4項目（2.1.2、2.1.5、2.1.6、2.2.1）は既定で無効、ほかは既定で有効である。

| 項目 | 内容 | docs-rules | 区分 | 扱い |
| --- | --- | --- | --- | --- |
| 1.1.1 本文 | 本文の常体と敬体をそろえる | GRM-001 | 重なる | 有効。GRM-001の`判定`欄に書いてある。no-mix-dearu-desumasuと同じ箇所を重ねて指摘するかは#21で確かめる |
| 1.1.2 見出し | 見出しは常体か体言止め | GRM-015 | 重なる | 有効。判定するのは見出し末尾の句点だけ |
| 1.1.3 箇条書き | 箇条書の文体を本文に合わせる | GRM-016 | 重なる | 有効。#12でGRM-016として取り込んだ |
| 1.1.5 図表のキャプション | キャプションの文体を本文に合わせる | GRM-017 | 重なる | 有効。判定できるのは画像の代替テキストだけ。GRM-017自体はAI判定 |
| 1.2.1 句点と読点 | 全角の「。」「、」を使う | NOT-002 | 重なる | 有効。読点はja-no-mixed-periodで判定できないため、この項目で見る |
| 1.2.2 ピリオドとカンマ | 和文の句読点に「.」「,」を使わない | NOT-002 | 重なる | 有効 |
| 2.1.2 漢字 | 常用漢字表を目安に漢字の使用を見る（辞書） | NOT-006 | 基準が違う | 無効のまま。NOT-006は#11の常用漢字表のデータで判定する |
| 2.1.5 カタカナ | 半角カナを使わない（辞書） | NOT-001 | 重なる | 有効にする。NOT-001の`判定`欄に書いてある。no-hankaku-kanaと同じ箇所を重ねて指摘するかは#21で確かめる |
| 2.1.6 カタカナの長音 | 長音符号の省略を見る（辞書） | NOT-011 | 基準が違う | 無効のまま。辞書の語がNOT-011（語末の長音を省かない）と一致するかは未確認。NOT-011は#11の外来語のデータとprh辞書で判定する |
| 2.1.8 算用数字 | 数字は半角 | NOT-015 | 重なる | 有効。#12でNOT-015を「半角で書く」に改めた |
| 2.1.9 アルファベット | 英字は半角 | NOT-015 | 重なる | 有効。理由は2.1.8と同じ |
| 2.1.10 算用数字（位取りの表記） | 位取りの「,」と小数点の「.」 | NOT-021 | 重なる | 有効 |
| 2.2.1 ひらがなと漢字の使い分け | 仮名と漢字の使い分け（辞書） | NOT-007、NOT-008 | 基準が違う | 無効のまま。NOT-008は「及び」「又は」も仮名で書くなど、辞書と基準が違う。NOT-008はprh辞書で判定する |
| 2.2.2 算用数字と漢数字の使い分け | 数える数は算用数字、慣用的な語は漢数字 | NOT-012、NOT-014 | 食い違う | 無効。「一つ」「三つ」のような和語の数え方を算用数字に直すよう指摘するが、NOT-014は公用文作成の考え方に従い漢数字で書く |
| 2.2.3 一部の助数詞の表記 | 「か月」「か所」などの書き方 | NOT-016 | 重なる | 有効。判定するのは数字の後の「ヶ」だけのため、「箇」「ケ」「カ」はprh辞書で判定する |
| 3.1.1 全角と半角の間 | 全角と半角の間に空白を入れない | NOT-022 | 重なる | 無効。NOT-022の`判定`欄にあるja-space-between-half-and-full-widthと重複するため |
| 3.1.2 全角どうし | 全角文字の間に空白を入れない | NOT-023 | 重なる | 有効。NOT-023の`判定`欄に書いてある。判定するのは片仮名どうしの間だけのため、漢字や平仮名の間はja-no-space-between-full-widthで補う |
| 3.2 カタカナ語間のスペース | カタカナ語の区切りは中点か半角空白 | NOT-017、NOT-023 | 重なる | 無効。ja-nakaguro-or-halfwidth-space-between-katakanaと重複するため |
| 3.3 かっこ類と隣接する文字の間のスペース | 括弧の前後の空白 | NOT-024 | 重なる | 有効。NOT-024の`判定`欄に書いてある。ja-no-space-around-parenthesesと同じ箇所を重ねて指摘するかは#21で確かめる |
| 4.1.1 句点 | 全角の「。」 | NOT-002 | 重なる | 有効 |
| 4.1.3 ピリオドとカンマ | 使うときは半角の「.」「,」 | NOT-021 | 重なる | 有効 |
| 4.2.1 感嘆符 | 使うときは全角の「！」 | NOT-003 | 基準が違う | 無効。NOT-003は「！」を使わないとしており、no-exclamation-question-markで判定する |
| 4.2.2 疑問符 | 使うときは全角の「？」 | NOT-003 | 基準が違う | 無効。理由は4.2.1と同じ |
| 4.2.4 中黒 | 全角の「・」 | NOT-025 | 重なる | 有効 |
| 4.2.5 波線 | 全角の「〜」 | NOT-025 | 重なる | 有効。検出するのは数字の間の半角の「~」だけで、修正先はU+301C。U+FF5Eの検出はprh辞書で足す |
| 4.2.6 ハイフン | 和文でハイフンを使わない | NOT-028 | 重なる | 有効。NOT-011の「-er」のように、英語のつづりを示す箇所で誤検出が出るかは#21で確かめる |
| 4.2.7 コロン | 使うときは全角の「：」 | NOT-026 | 重なる | 有効。#12で、`rules/`の「ルール：」のような項目名の後のコロンも全角にそろえた |
| 4.2.8 セミコロン | 和文でセミコロンを使わない | NOT-027 | 重なる | 有効 |
| 4.2.9 ダッシュ | 和文でダッシュを使わない | なし | docs-rulesにない | 無効。第2.2版の項目で、第4.0版では削除されている（NOT-028の注記） |
| 4.3.1〜4.3.4 丸かっこ・大かっこ・かぎかっこ・二重かぎかっこ | 全角の括弧を使う | NOT-018、NOT-025 | 重なる | 有効。4.3.1と4.3.2はNOT-025の`判定`欄に書いてある。`判定`欄のルール名に含まれる半角の括弧は除外する（NOT-025の注記） |
| 4.3.5〜4.3.8 二重引用符・中かっこ・山かっこ・一重引用符 | 対の有無と、和文で使わないこと | NOT-018 | 重なる | 有効 |

preset-jtf-styleの各項目は、設定ファイルでは「2.1.2.漢字」のような項目番号と項目名をつないだキーで指定する。READMEには一部のキーしか載っておらず、全項目のキーはパッケージの`index.js`で確かめる。#21で設定ファイルを書くときに確かめる。

## preset-ja-spacing

全11ルール。既定では9ルールが有効、2ルールが無効である。リポジトリの文書は、#27で全角と半角の間の空白を取り除く書き方にそろえ、#12でNOT-022〜024のルールにした。

| ルール | 既定 | docs-rules | 区分 | 扱い |
| --- | --- | --- | --- | --- |
| ja-space-between-half-and-full-width | 有効（空白を入れない） | NOT-022 | 重なる | 有効。NOT-022の`判定`欄に書いてある |
| ja-no-space-between-full-width | 有効 | NOT-023 | 重なる | 有効。jtf-styleの3.1.2が見ない漢字や平仮名の間を補う。`判定`欄に足すかは#21で決める |
| ja-nakaguro-or-halfwidth-space-between-katakana | 有効 | NOT-017、NOT-023 | docs-rulesにない | 有効。カタカナ語の区切り方を見るもので、NOT-017の中点の用途と食い違わない。片仮名の複合語の区切り方は#11の外来語の表記と合わせて決める（NOT-023） |
| ja-no-space-around-parentheses | 有効 | NOT-024 | 重なる | 有効。jtf-styleの3.3と同じ箇所を重ねて指摘するかは#21で確かめる |
| ja-no-space-around-slash | 有効 | なし | docs-rulesにない | 有効 |
| ja-space-after-exclamation | 有効 | NOT-003 | 食い違う | 無効。NOT-003で「！」を使わないため、判定する対象がない |
| ja-space-after-question | 有効 | NOT-003 | 食い違う | 無効。理由はja-space-after-exclamationと同じ |
| ja-space-around-code | 有効 | なし | docs-rulesにない | 有効。リポジトリの文書はインラインコードの前後に空白を入れない |
| ja-space-around-emphasis | 無効 | なし | docs-rulesにない | 無効のまま |
| ja-space-around-link | 有効 | なし | docs-rulesにない | 有効 |
| ja-space-around-strong | 無効 | なし | docs-rulesにない | 無効のまま |

## docs-rulesの機械判定ルールとの対応

`判定：機械`のルールのうち、textlintのルール名を`判定`欄に書けるものと、ほかの手段で判定するものを分けた。

| docs-rules | 判定の手段 | `判定`欄 |
| --- | --- | --- |
| FW-001、FW-002 | ja-no-redundant-expression | 記載済み |
| FW-004 | ja-no-weak-phrase | 記載済み |
| FW-008 | prh辞書（#21） | `機械`のまま |
| GRM-001 | no-mix-dearu-desumasu、preset-jtf-styleの1.1.1 | 記載済み |
| GRM-015 | preset-jtf-styleの1.1.2 | 記載済み |
| GRM-016 | preset-jtf-styleの1.1.3 | 記載済み |
| GRM-002 | sentence-length | 記載済み |
| GRM-004 | no-doubled-conjunctive-particle-ga | 記載済み |
| GRM-005 | no-doubled-joshi | 記載済み |
| GRM-006 | no-double-negative-ja | 記載済み |
| NOT-001 | no-hankaku-kana、preset-jtf-styleの2.1.5 | 記載済み |
| NOT-002 | ja-no-mixed-period、preset-jtf-styleの1.2.1・1.2.2 | 記載済み |
| NOT-003 | no-exclamation-question-mark | 記載済み |
| NOT-004 | prh辞書か自前の判定（#21） | `機械`のまま |
| NOT-006 | #11の常用漢字表のデータ | `機械`のまま |
| NOT-008 | prh辞書（#21） | `機械`のまま |
| NOT-010 | #11の送り仮名のデータ | `機械`のまま |
| NOT-011 | #11の外来語のデータとprh辞書 | `機械`のまま |
| NOT-012 | 自前の判定（#21）。位取りはNOT-021で判定する | `機械`のまま |
| NOT-013 | 自前の判定（#21） | `機械`のまま |
| NOT-015 | preset-jtf-styleの2.1.8・2.1.9 | 記載済み |
| NOT-016 | preset-jtf-styleの2.2.3とprh辞書 | 記載済み（2.2.3） |
| NOT-021 | preset-jtf-styleの2.1.10 | 記載済み |
| NOT-022 | ja-space-between-half-and-full-width | 記載済み |
| NOT-023 | preset-jtf-styleの3.1.2、ja-no-space-between-full-width | 記載済み（3.1.2） |
| NOT-024 | preset-jtf-styleの3.3、ja-no-space-around-parentheses | 記載済み（3.3） |
| NOT-025 | preset-jtf-styleの4.2.4・4.2.5・4.3.1・4.3.2とprh辞書（U+FF5E） | 記載済み（preset-jtf-style） |
| NOT-026 | preset-jtf-styleの4.2.7 | 記載済み |
| NOT-027 | preset-jtf-styleの4.2.8 | 記載済み |
| NOT-028 | preset-jtf-styleの4.2.6 | 記載済み |

- このPRで`判定`欄に書き足したルールはない。preset-ja-technical-writingで重なるルールは以前から、preset-jtf-styleで重なる項目は#12で、すでに`判定`欄に書いてある
- GRM-017は`判定：AI`のため表に含めない。画像の代替テキストに限り、preset-jtf-styleの1.1.5で機械判定できる（GRM-017の注記）
- prh辞書とja-no-space-between-full-width、ja-no-space-around-parenthesesを`判定`欄に足すかは、#21で設定ファイルを置くときに決める

## #21に渡すこと

- `npx`の実行方法：`npx -p`で一時的に入れたプリセットを、textlintが設定ファイルから見つけられるかは未確認。見つけられない場合は、`evaluators/`の中で`npm install`してから実行する形に変える
- sentence-lengthの上限：GRM-002の上限を決め、`max`に設定する
- no-mix-dearu-desumasuの設定：本文・見出し・箇条書の指定を自動判定にする。設定値が空文字で通るかを確かめる
- preset-jtf-styleの設定キー：無効にする項目のキーを`index.js`で確かめる
- prh辞書：FW-008、NOT-004、NOT-008、NOT-011、NOT-016の語と、NOT-025の「～」（U+FF5E）を辞書にする
- 重複の確認：次の組が、同じ箇所を重ねて指摘しないか
  - `判定`欄に両方の名前があるため両方を有効にした組（no-mix-dearu-desumasuと1.1.1、no-hankaku-kanaと2.1.5）
  - 片方で補う組（3.1.2とja-no-space-between-full-width、3.3とja-no-space-around-parentheses）
- 誤検出の除外：次の箇所
  - `判定`欄のルール名に含まれる半角の括弧（NOT-025の注記）
  - `出典`欄の資料名と項目番号の間の空白（「JTFスタイルガイド」と「2.1.5」の間）
  - 「」の中に例示した「.」「,」（1.2.1がこの文書の4.1.3の行を指摘した）
  - NOT-011の「-er」のような英語のつづり
- arabic-kanji-numbersの範囲：「一つ」「二つ」を算用数字へ直すよう指摘するなら、無効にする

## 出典

- [textlint-rule-preset-ja-technical-writing（README）](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing/blob/master/README.md)
- [textlint-rule-preset-ja-technical-writing（リリース）](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing/releases)
- [textlint-rule-preset-JTF-style（README）](https://github.com/textlint-ja/textlint-rule-preset-JTF-style/blob/master/README.md)
- [textlint-rule-preset-JTF-style（リリース）](https://github.com/textlint-ja/textlint-rule-preset-JTF-style/releases)
- [textlint-rule-preset-ja-spacing（README）](https://github.com/textlint-ja/textlint-rule-preset-ja-spacing/blob/master/README.md)
