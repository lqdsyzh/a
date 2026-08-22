# 社区（短期过渡）

这是仓库 lqdsyzh/a 的社区引导分支。目标是用最少的成本（0 服务器成本）在 7 天内搭建一个可访问、可讨论的社区入口，长期再迁移到独立论坛（Discourse）。

快速说明：
- 我已在分支 `community/bootstrap` 中放置一套社区文档和 GitHub Pages 静态站点模板（docs/），你可以把它发布为 GitHub Pages 网站作为短期论坛入口。
- 我同时在仓库里放了一套常见的协作文件（CONTRIBUTING、CODE_OF_CONDUCT、ISSUE/PULL 模板），方便新的贡献者参与。

接下来做什么（我建议）：
1. 在仓库设置中启用 GitHub Pages，发布源选择 `docs/` 文件夹（通常在 Settings → Pages）。
2. 在仓库设置中启用 Discussions（可选，但建议启用以配合 Giscus）。
3. 按 docs/ 中的说明选用 Giscus（使用 Discussions）或 Utterances（使用 Issues）作为评论/讨论后端。Giscus 更接近论坛体验但需要创建 Discussion 分类并获取分类 ID；Utterances 更简单，立刻可用。

如果你确认，我会：
- 等你启用 Pages（或我也可以帮你创建部署 workflow 自动发布）；
- 指导你用 QQ 邮箱开启 SMTP（为未来 Discourse 做准备）；
- 准备 Discourse 的一键部署脚本，等你有服务器就能快速上线。

---

分支链接: https://github.com/lqdsyzh/a/tree/community/bootstrap
