# 壁纸平台

一个面向公开浏览与下载的壁纸网站。项目使用 Next.js 构建主站、管理后台和 API；图片文件存放在 Cloudflare R2，业务数据存放在 TiDB Cloud。

第一阶段只实现“管理员上传/审核发布 → 用户浏览与下载”的闭环。自动采集器使用 Node.js 和 Playwright 独立运行，采集到的素材必须先经过人工审核。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS v4
- TiDB Cloud + Drizzle ORM
- Cloudflare R2（S3 API）
- Node.js + Playwright + Sharp（采集和图片处理）
- Cloudflare Workers（通过 OpenNext 部署）

## 目录说明

```text
src/app/                 页面、管理后台和 API 路由
src/db/                  Drizzle 数据库 Schema 与迁移
src/lib/storage/         图片存储抽象接口
scripts/crawler/         独立的 Playwright 采集器
patches/                 对依赖的本地补丁（pnpm patchedDependencies）
.github/workflows/       部署和采集任务工作流
PROJECT_PLAN.md          详细实施计划
```

## 本地启动

环境要求：Node.js 20 或更高版本、pnpm。

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

启动后打开 [http://localhost:3000](http://localhost:3000)。公开站已实现首页瀑布流、搜索与方向/分类/分辨率/色彩筛选、详情预览、上下篇导航与下载，并记录浏览/下载统计；`/admin` 已实现管理员草稿、R2 直传、处理队列、审核状态机、分类标签管理和采集记录查看。

## 管理闭环初始化

1. 创建一个 TiDB Cloud Starter 实例。TiDB 是兼容 MySQL 的云数据库，不需要在电脑上安装数据库服务；在控制台点击 **Connect**，生成并保存密码，然后复制连接信息到 `.env.local` 的 `DATABASE_URL`。运行时使用 TiDB Serverless 的 HTTPS 驱动，无需额外的 SSL 配置；R2 Bucket 必须保持私有。
2. 执行 `pnpm db:migrate` 创建表。
3. 执行 `pnpm admin:create <email> <password>` 创建唯一的管理员账号。公开注册默认关闭。
4. 登录 `/sign-in`，创建草稿、填写来源和授权信息并上传原图。
5. 上传后执行 `pnpm processor <wallpaper-id>`。该命令在 Node.js 中使用 Sharp 生成原图、1920、960 与缩略图版本；完成后可在后台审核发布。

图片处理不在 Next.js/Cloudflare Worker 请求中运行。生产环境应将 `pnpm processor` 放进受控的本机管理任务或 GitHub Actions 作业中。

没有 TiDB/R2 密钥时仍可做基础路由检查：`/api/health` 应返回 `{"status":"ok"}`，未配置数据库访问 `/admin` 会重定向到 `/sign-in`。真正的登录、直传和处理链路需要先完成上面的云资源初始化。

## Cloudflare 部署

`pnpm cf:build` 通过 OpenNext 生成 `.open-next/` 下的 Cloudflare Worker 产物；`pnpm cf:deploy` 会构建并发布到 Cloudflare。`wrangler dev` 可本地预览 Worker，若本机 workerd 无法启动（Windows 下可能缺少 Visual C++ 运行库），以 CI 的 Linux 构建结果为准。

`pnpm test` 运行单元测试，`pnpm e2e` 运行 Playwright 浏览器冒烟测试（首次运行先执行 `pnpm exec playwright install chromium`）。`pnpm release:check` 会在发版前跑完 lint、类型检查、单测、Next 构建、Cloudflare 构建和 wrangler dry-run。

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中配置以下 Secrets 后，手动运行 `deploy.yml` 即可部署：

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Worker 环境变量与本地一致：`DATABASE_URL`、`R2_*`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`NEXT_PUBLIC_SITE_URL`。这些值在 Cloudflare 控制台的 Worker 设置里配置，不要提交到仓库。

## 云资源安全与备份

- R2 Bucket 必须保持私有。原图和派生图先落在 `staging/` 暂存前缀，只有审核发布后的对象会通过预签名链接或独立公开域名访问；暂存对象不会作为公开资源暴露。
- 浏览器直传走 R2 CORS，只允许正式站点和本地开发域名对 `staging/` 前缀执行 `PUT`，并且只配置必要方法（`PUT`、`HEAD`、`OPTIONS`）和允许的请求头。
- TiDB 连接串使用 `mysql://` 格式并开启 TLS（`?ssl-mode=VERIFY_IDENTITY`）；页面在缺少有效连接串时会优雅降级，不会返回 500。
- 运行 `pnpm backup` 会把数据库全表数据和 R2 对象清单导出到 `backups/`（已加入 `.gitignore`）。建议把该目录同步到独立存储，作为恢复索引和对象清单的依据。

## 素材与版权

本项目不会将“可被访问”视为“可被转载”。采集器只应处理明确允许的来源；每个素材都必须保存来源、作者与授权信息，且在后台审核通过前不得公开发布。
