# tests/

リポジトリの構成が壊れていないかを確かめるテストを置く。依存パッケージを使わず、Python 3の標準ライブラリだけで動かす。リポジトリのルートで実行する。

| ファイル | 確かめること | 実行 |
| --- | --- | --- |
| [test_skill_size.py](test_skill_size.py) | `skills/*/SKILL.md`が20,000バイト未満であること。Claude Codeがコンテキストの圧縮後にスキルを20,000文字で切り捨てるため | `python3 tests/test_skill_size.py` |

rules・schemas・templatesの整合を確かめる回帰テストは #22 で足す。
