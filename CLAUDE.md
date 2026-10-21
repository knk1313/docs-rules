# CLAUDE.md

ルール本体は[AGENTS.md](AGENTS.md)（Codex等と共有する単一ソース）。本ファイルはClaude Code用の薄いラッパーで、`@AGENTS.md`構文で本体規約をセッション開始時にコンテキストへ展開する。

Claude Code固有の補助（skills / agents / slash commands / docs）は`.claude/`配下に置く。個人ローカル設定は`.claude/settings.local.json`に、MCP認証情報は`.claude/.credentials.json`に置く（いずれも`.gitignore`済）。

@AGENTS.md