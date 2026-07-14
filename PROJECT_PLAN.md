# 壁纸平台实施计划

## 项目目标

构建一个以深色视觉、瀑布流浏览和全屏预览为核心的壁纸网站。第一阶段由管理员和审核流程控制素材质量；用户可公开浏览、筛选、预览和下载壁纸。

核心边界：Next.js 负责网站、后台和轻量 API；TiDB 保存业务数据；R2 保存图片对象；采集与 Sharp 图片处理在独立 Node.js 任务中运行，不在 Web 请求和 Cloudflare Worker 中执行。

## 第一阶段范围

### 公开网站

1. 首页推荐、最新壁纸与瀑布流列表。
2. 分类、标签、颜色、方向和分辨率筛选。
3. 壁纸详情页：多规格预览、全屏查看、上下张切换和原图下载。
4. 响应式布局、默认深色主题、基础 SEO（metadata、sitemap、robots）。
5. 浏览和下载计数；计数接口需限流并避免重复统计。

### 管理后台

1. 单管理员登录，不开放公开注册。
2. 直接上传原图到 R2 的预签名 URL 流程。
3. 编辑标题、描述、分类、标签、来源、作者与授权信息。
4. 草稿、待审核、已发布、已下架四种状态。
5. 发布、下架、删除和审核记录。

### 不在第一阶段实现

- 普通用户注册、收藏与下载历史。
- AI 壁纸生成、推荐系统、相似图搜索。
- 自动发布、复杂运营分析和多租户权限。
- 跨云存储迁移和复杂 monorepo 拆分。

## 数据模型演进

第一版从 `wallpapers` 开始，随后按功能增加：

- `wallpaper_assets`：原图、缩略图、预览图的 R2 Key、尺寸、格式和哈希。
- `categories`、`tags`、`wallpaper_tags`：分类和标签。
- `sources`、`licenses`：来源页、作者、许可文本与证据。
- `users`：管理员；后续再支持普通用户。
- `favorites`：仅在开放用户功能时添加。
- `crawl_tasks`、`crawl_records`：仅在启用自动采集后添加。

图片二进制不进入数据库。建议对象 Key 结构为：

```text
wallpapers/{year}/{month}/{wallpaper-id}/original.webp
wallpapers/{year}/{month}/{wallpaper-id}/preview-1920.webp
wallpapers/{year}/{month}/{wallpaper-id}/preview-960.webp
wallpapers/{year}/{month}/{wallpaper-id}/thumbnail-480.webp
```

## 图片上传与处理

1. 管理后台请求 Next.js API 获取短时有效的 R2 `PUT` 预签名 URL。
2. API 验证管理员身份、文件类型、对象 Key 和上传意图。
3. 浏览器直接上传 R2；R2 配置仅允许本站域名的 CORS。
4. 客户端通知 API；API 使用 `HEAD` 校验对象存在和元数据后创建草稿记录。
5. 图片处理任务用 Sharp 生成缩略图、预览图和占位图，计算 SHA256 与感知哈希。
6. 审核通过后将壁纸状态变为 `published`。

预签名 URL 是临时 bearer token，必须短期有效且只允许一个对象和一个操作；不可将 R2 Access Key 暴露给浏览器。

## 自动采集器

采集器使用 Node.js、Playwright 和 Sharp，位于 `scripts/crawler`。它不在 Next.js Route Handler 中运行。

每个来源实现为独立 Provider，并必须具备：

1. 来源条款与授权范围的人工确认。
2. 合理的请求频率、重试与失败记录，遵守 robots.txt 和网站条款。
3. 保存来源 URL、作者、授权、抓取时间和原始元数据。
4. 下载前按 URL 和 SHA256 去重；下载后再使用感知哈希发现近似重复。
5. 新素材一律为 `pending_review`，禁止自动公开发布。

GitHub Actions 先保留手动触发；稳定后再加入非整点的定时任务。任务必须支持幂等、断点续跑和人工重跑，因为定时工作流并非严格准点，且公开仓库长期无活动可能被自动停用。

## 部署计划

1. 创建 TiDB Cloud、R2 Bucket 和 Cloudflare Worker 项目。
2. 在 Cloudflare 中配置环境变量与密钥，不提交到仓库。
3. 使用 OpenNext 将 Next.js 部署到 Cloudflare Workers。
4. 先使用 `*.workers.dev` 地址，稳定后再绑定自定义域名。
5. 部署前运行 `pnpm lint`、`pnpm typecheck`、构建和 Workers 预览。
6. 接入 Cloudflare Web Analytics；上线后再评估 Sentry。

## 推荐开发顺序

1. 初始化 Git 仓库、pnpm 依赖与本地首页。
2. 配置 TiDB、Drizzle Schema 和迁移。
3. 配置 R2 StorageService、管理员鉴权及上传草稿流。
4. 实现后台审核和公开列表/详情页。
5. 生成图片多规格版本和 SEO 页面。
6. 部署 Cloudflare Workers 并配置 CI。
7. 最后才为明确授权来源编写 Playwright Provider。

