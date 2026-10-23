#!/usr/bin/env python3
"""SKILL.mdの大きさが上限を超えていないかを確かめる。

Claude Codeは、コンテキストの圧縮後にスキルを読み直すとき、SKILL.mdを
20,000文字で切り捨てる（obra/superpowers #2481の報告）。切り捨てられた先は
そのセッションの間、エージェントから見えなくなる。ときどきしか使わない内容は
SKILL.mdに書かず、rules/やschemas/に置いて、必要な手順で読ませる。

文字数ではなくバイト数で測る。日本語はUTF-8で1文字が3バイトになるため、
バイト数のほうが厳しい基準になる。

使い方：リポジトリのルートで `python3 tests/test_skill_size.py` を実行する。
"""

import sys
from pathlib import Path

LIMIT = 20_000

REPO_ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    """skills/以下のすべてのSKILL.mdを調べ、上限以上のものがあれば1を返す。"""
    skills = sorted(REPO_ROOT.glob("skills/*/SKILL.md"))
    if not skills:
        print("FAIL: skills/*/SKILL.md が見つからない", file=sys.stderr)
        return 1

    failed = False
    for skill in skills:
        size = skill.stat().st_size
        relative = skill.relative_to(REPO_ROOT)
        if size >= LIMIT:
            print(f"FAIL: {relative} は {size:,} バイト（上限は {LIMIT:,} バイト未満）", file=sys.stderr)
            failed = True
        else:
            print(f"ok: {relative} は {size:,} バイト")

    if failed:
        print("ときどきしか使わない内容は rules/ や schemas/ に移す。", file=sys.stderr)
        return 1
    print(f"PASS: すべての SKILL.md が {LIMIT:,} バイト未満")
    return 0


if __name__ == "__main__":
    sys.exit(main())
