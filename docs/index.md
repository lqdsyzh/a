# 社区首页

欢迎来到 lqdsyzh/a 的社区！

## 快速开始

- 你可以在这里阅读贡献指南、行为守则，并通过 GitHub Issues、Discussions 或页面下方的评论与我们讨论。
- 我们提供两种短期讨论方案：
  - Giscus（基于 GitHub Discussions）—— 更像论坛，但需要在仓库开启 Discussions 并创建分类。适合长期过渡到 Discourse 的情形。
  - Utterances（基于 GitHub Issues）—— 立刻可用、零额外权限，方便快速接入讨论功能。

## 站点示例

下面的评论面板示例使用 Utterances（如果你更愿意用 Giscus，请参照下方 Giscus 配置帮助并把脚本替换为 Giscus 的脚本）。

<!-- Utterances 评论嵌入示例（复制到 HTML 页面合适位置） -->

<script src="https://utteranc.es/client.js"
        repo="lqdsyzh/a"
        issue-term="pathname"
        label="comment"
        theme="github-light"
        crossorigin="anonymous"
        async>
</script>


## 下一步（操作指南）

1. 在仓库设置中启用 GitHub Pages，发布源选择 `docs/` 文件夹；等待几分钟访问：https://<your-username>.github.io/a/
2. 在仓库设置中启用 Discussions（如果你想用 Giscus）；然后在 Discussions 中创建一个分类（Category），并记下分类 ID。
3. 如果要使用 Giscus，请在页面中替换 Utterances 的脚本为 Giscus 的嵌入脚本，并把 repo、category 等参数换成你的仓库和分类 ID（详细步骤见 ../deploy/README.md）。

