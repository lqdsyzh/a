# 部署与短期方案说明

目标：在没有服务器与域名的情况下，用 GitHub Pages + 评论系统（Utterances 或 Giscus）快速搭建一个“看起来像论坛”的社区入口。

短期方案（推荐）
- GitHub Pages (docs/) + Utterances（Issues 作为后端）或 Giscus（Discussions 作为后端）。
- 完全免费：GitHub Pages 免费托管静态站；Utterances/Giscus 都是免费的前端组件（Giscus 依赖 Discussions）。

操作步骤（最小可行）
1. 在仓库 Settings → Pages 选择 Source 为 branch: community/bootstrap, folder: /docs，保存并等待部署。
2. 若想使用 Giscus：在 Settings → Discussions 中启用 Discussions（如果尚未启用），然后在 Discussions -> Categories 创建一个分类（例如：General），创建后用浏览器打开分类页面并在 URL 中找到 category 的数字 ID（某些情况下需要用开发者工具或 API 查询）。把该 ID 填入 docs/index.html 的 Giscus 配置中（示例见下）。
3. 若不想启用 Discussions，保持默认并使用 Utterances（会把评论以 Issue 的形式保存在本仓库），只需把 docs/index.md 中的 Utterances 脚本保留即可。

Utterances 快速接入（推荐立刻使用）
- 将以下脚本放到你静态页面的合适位置（已经在 docs/index.md 示例中包含）：

<script src="https://utteranc.es/client.js" repo="lqdsyzh/a" issue-term="pathname" label="comment" theme="github-light" crossorigin="anonymous" async></script>

- 第一次访问会在目标仓库创建 Issue 来保存评论。你可以在仓库的 Issues 中看到这些讨论。

Giscus（如果你开启了 Discussions）
- Giscus 嵌入示例（需要替换 repo、repoId、category、categoryId）：

<script src="https://giscus.app/client.js"
        data-repo="OWNER/REPO"
        data-repo-id="REPO_ID"
        data-category="General"
        data-category-id="CATEGORY_ID"
        data-mapping="pathname"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-theme="light"
        crossorigin="anonymous"
        async>
</script>

- 如何获取 repoId 与 categoryId：
  - 使用 GitHub REST API（需要你的账号权限）：
    - repoId：GET /repos/{owner}/{repo} 返回字段 id
    - categoryId：GET /repos/{owner}/{repo}/discussions/categories 返回 categories 列表

准备 Discourse（长期目标）
- 我会把 Discourse 的 Docker 部署脚本和详细说明放在 `discourse/` 目录，等你有服务器与域名时可以一键部署。

邮件（SMTP）
- 你可以使用 QQ 邮箱作为 SMTP，但需要：开启 POP/SMTP 服务并生成授权码。详细步骤见 `discourse/README.md`（我会把如何生成授权码写在里面）。

预算与时间
- 本短期方案：0 元（除非你选择购买域名或 VPS）。
- 在 1 周内可以上线 GitHub Pages 社区入口并接入 Utterances 讨论。

