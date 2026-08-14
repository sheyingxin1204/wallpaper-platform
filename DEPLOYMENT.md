# 首次发布运行手册

本文档把从仓库到线上可访问版本的全部外部步骤串起来。代码侧门禁已经就绪，本手册只处理凭据、云资源和首次验收。

## 1. 云资源准备

### TiDB Cloud

1. 创建 TiDB Cloud Serverless 实例。
2. 在控制台生成并保存密码，复制连接串。运行时代码要求 `mysql://` 格式，推荐带 `?ssl-mode=VERIFY_IDENTITY`。
3. 记录连接串为 `DATABASE_URL`，格式示例：

```text
mysql://<user>:<password>@<host>:4000/<database>?ssl-mode=VERIFY_IDENTITY
```

### Cloudflare R2

1. 创建私有 Bucket（例如 `wallpapers`），记录 Bucket 名。
2. 在账号 API Tokens 中创建 R2 的 Access Key ID 和 Secret Access Key。
3. 记录 Account ID。
4. 配置 Bucket CORS，只允许正式站点和本地开发域名：
   - Allowed Origins：`https://<你的正式域名>` 与 `http://localhost:3000`
   - Allowed Methods：`PUT`、`HEAD`、`OPTIONS`
   - Allowed Headers：`Content-Type`、`Content-Length`
   - Expose Headers：`ETag`
5. Bucket 必须保持私有。公开图片通过预签名链接访问；可选地，为派生图配置独立公开域名 `R2_PUBLIC_BASE_URL`（原图和暂存对象仍走预签名）。

## 2. GitHub Actions Secrets

在仓库 Settings → Secrets and variables → Actions 配置以下 Secrets：

```text
DATABASE_URL             TiDB Serverless 连接串
R2_ACCOUNT_ID            Cloudflare 账号 ID
R2_ACCESS_KEY_ID         R2 Access Key ID
R2_SECRET_ACCESS_KEY     R2 Secret Access Key
R2_BUCKET                私有 Bucket 名
CLOUDFLARE_ACCOUNT_ID    Cloudflare 账号 ID（部署用）
CLOUDFLARE_API_TOKEN     Cloudflare API Token（Workers 编辑权限）
BETTER_AUTH_SECRET       至少 32 字符的随机字符串
CRAWLER_ALLOWED_HOSTS    已核实授权的采集域名列表（按需）
CRAWLER_USER_AGENT       采集 User-Agent（按需）
```

`NEXT_PUBLIC_SITE_URL` 是编译期内联的站点 URL，写死在 Cloudflare 构建时的环境中；正式域名确定后在部署工作流的构建步骤或 Cloudflare 构建配置中设置。

## 3. 首次部署顺序

1. 运行 **CI** 工作流，确认 `verify` 与 `e2e` 两个作业全绿。
2. 运行 **Migrate Database** 工作流，把确认开关置为 true，执行生产迁移。
3. 在 Cloudflare 控制台给 Worker 配置环境变量：
   - `DATABASE_URL`、`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`NEXT_PUBLIC_SITE_URL`
   - 敏感值用 Secret 类型，非敏感值用文本变量。
   - `BETTER_AUTH_URL` 必须填正式域名（例如 `https://wallpaper.example.com`），`NEXT_PUBLIC_SITE_URL` 同理；认证已开启 `trustHost`，依赖正确的主机头校验会话。
4. 运行 **Deploy** 工作流：
   - `site_url` 输入框必须填正式站点 URL（例如 `https://wallpapers.example.com`），构建时会内联进 sitemap、OpenGraph 与 robots。
   - `contact_email` 输入框填公开页脚展示的版权/下架联系邮箱（可留空隐藏）。
   - 保持 `keep_vars` 为 true，避免覆盖已配置的变量。
5. 执行 `pnpm admin:create <email> <password>` 创建唯一管理员账号。生产环境不应把该命令放入自动流程，建议在本机或一次性维护环境中执行。
6. 访问正式域名验证 `/api/health`、`/robots.txt`、`/sitemap.xml` 与 `/sign-in`。

## 4. 端到端验收清单

- [ ] 首页无数据库依赖的降级状态不出现 500。
- [ ] 管理员登录、创建草稿、R2 直传、进入处理队列。
- [ ] 运行 `pnpm processor <wallpaper-id>` 后出现四个素材版本。
- [ ] 后台发布后，首页列表、详情页、下载链接、sitemap 均可用。
- [ ] 下架后详情页 noindex 且列表消失。
- [ ] 未发布/暂存对象无法通过公开 URL 访问。
- [ ] 采集任务（若有来源）能创建 `pending_review` 草稿且保留来源与授权记录。
- [ ] 操作日志记录创建、处理、审核、下架等关键动作。
- [ ] `pnpm backup` 能生成数据库备份和 R2 对象清单。
- [ ] 页脚版权/下架联系渠道可见（配置 `NEXT_PUBLIC_CONTACT_EMAIL` 后公开页展示）。

## 5. 回滚与故障处理

- 代码回滚：GitHub 上把 main 恢复到上一个稳定提交，重新运行 Deploy 工作流。
- 数据库：迁移前先运行 `pnpm backup`；需要回滚迁移时，使用 TiDB 控制台或备份文件恢复，不要反向执行迁移。
- 图片：R2 对象按 `wallpapers/{year}/{month}/{wallpaper-id}/` 组织，回滚代码不会删除对象。
- 故障定位：Cloudflare Worker 的 Observability 日志、GitHub Actions 运行日志、`backups/` 中的审计与对象清单。
