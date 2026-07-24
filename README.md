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

启动后打开 [http://localhost:3000](http://localhost:3000)。公开站仍在下一阶段建设；`/admin` 已实现管理员草稿、R2 直传、处理队列和审核状态机。

## 管理闭环初始化

1. 在 `.env.local` 中填写 TiDB、R2 和 Better Auth 变量；R2 Bucket 必须保持私有。
2. 执行 `pnpm db:migrate` 创建表。
3. 执行 `pnpm admin:create <email> <password>` 创建唯一的管理员账号。公开注册默认关闭。
4. 登录 `/sign-in`，创建草稿、填写来源和授权信息并上传原图。
5. 上传后执行 `pnpm processor <wallpaper-id>`。该命令在 Node.js 中使用 Sharp 生成原图、1920、960 与缩略图版本；完成后可在后台审核发布。

图片处理不在 Next.js/Cloudflare Worker 请求中运行。生产环境应将 `pnpm processor` 放进受控的本机管理任务或 GitHub Actions 作业中。

没有 TiDB/R2 密钥时仍可做基础路由检查：`/api/health` 应返回 `{"status":"ok"}`，未配置数据库访问 `/admin` 会重定向到 `/sign-in`。真正的登录、直传和处理链路需要先完成上面的云资源初始化。

## 素材与版权

本项目不会将“可被访问”视为“可被转载”。采集器只应处理明确允许的来源；每个素材都必须保存来源、作者与授权信息，且在后台审核通过前不得公开发布。
