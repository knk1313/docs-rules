# docs-rules

個人用のドキュメント執筆ルールセットです。Claude Code の Agent Skill として使うことを想定しています。

- **提案書** — `skills/docs-rules/references/doctypes/sales-proposal.md`
- **セッションログ** — `skills/docs-rules/references/doctypes/session-log.md`

## インストール

### 1. 手動配置

Claude Code のスキルディレクトリにこのリポジトリをクローンして配置します。

```bash
git clone https://github.com/knk1313/docs-rules.git
cp -r docs-rules/skills/docs-rules ~/.claude/skills/docs-rules
```

配置後、Claude Code を再起動すると自動的に読み込まれます。

### 2. `npx skills add`

GitHub のリポジトリから以下でインストールできます。

```bash
npx skills add knk1313/docs-rules
```

### 3. Claude Code プラグイン

```
/plugin marketplace add knk1313/docs-rules
/plugin install docs-rules@docs-rules
```