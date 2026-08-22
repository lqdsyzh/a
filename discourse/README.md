# Discourse 准备（长期迁移）

本目录（discourse/）包含 Discourse 部署相关的脚本和说明（尚未添加完整脚本）。在你有服务器与域名时，我会把完整的一键部署脚本放在这里。目前先记录必需项：

必需项：
- 一台 VPS（建议至少 2 vCPU、4GB 内存；最低可尝试 1GB，但性能受限）
- 域名（用于 SSL 与邮件回调）
- SMTP 服务（QQ 邮箱可用，但强烈建议使用专门的 SMTP 提供商以避免限制）

后续我会把 docker-compose 与 Discourse 官方安装脚本加入此目录。
