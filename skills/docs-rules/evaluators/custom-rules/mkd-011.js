"use strict";
// MKD-011 画像には代替テキストを付ける。
// markdownlint の MD045 は、空白だけの代替テキスト（「![ ](map.png)」）を付けたものとみなすため、ここで判定する。
// 空の代替テキスト（「![](map.png)」）は MD045 が拾うため、ここでは見ない。

module.exports = function (context) {
  const { Syntax, RuleError, report } = context;
  return {
    [Syntax.Image](node) {
      const alt = node.alt || "";
      if (alt !== "" && alt.trim() === "") {
        report(node, new RuleError("画像の代替テキストが空白だけである"));
      }
    },
  };
};
