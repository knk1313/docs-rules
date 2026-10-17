# docs-rules

## ディレクトリ構成

```
.
├── skills/
│   └── docs-rules/
│       ├── SKILL.md
│       ├── rules/          # Markdown記法、文体、表記などの共通ルール
│       ├── schemas/        # 必須セクションや文書構造の定義
│       ├── templates/      # 用途別の文書テンプレート
│       ├── prompts/        # 生成・評価・修正に使用するプロンプト
│       └── evaluators/     # コードおよびAIによる評価処理
└── tests/                  # 期待する生成例と回帰テスト
```

## インストール

3通りあります。

### 1. 手動配置

クローンして、スキルディレクトリに置きます。

```bash
git clone https://github.com/knk1313/docs-rules.git
cp -r docs-rules/skills/docs-rules ~/.claude/skills/docs-rules
```

Claude Code を再起動すると読み込まれます。

### 2. `npx skills add`

GitHub から直接入れます。

```bash
npx skills add knk1313/docs-rules
```

### 3. Claude Code プラグイン

Claude Code のセッション内で実行します。

```
/plugin marketplace add knk1313/docs-rules
/plugin install docs-rules@docs-rules
```

## ロードマップ

```mermaid
flowchart TD
    S1["Step 1（今ここ）<br>ルール集をドキュメントで示す<br>守れたかは人が読んで判断する"]
    S2["Step 2<br>ルールベース採点<br>機械的に判定できるルールをコードにして採点する"]
    S3["Step 3<br>AI 評価<br>コードで見きれないところを AI に評価させる"]
    S4["Step 4<br>書き直し<br>採点と評価の結果を渡して書き直させる"]

    S1 --> S2 --> S3 --> S4
    S4 -->|"基準を満たすまで繰り返す"| S2
```