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

启动后打开 [http://localhost:3000](http://localhost:3000)。目前首页、`/admin` 和 `/api/health` 是项目骨架页面；数据库、R2 和鉴权尚未接入。

## 素材与版权

本项目不会将“可被访问”视为“可被转载”。采集器只应处理明确允许的来源；每个素材都必须保存来源、作者与授权信息，且在后台审核通过前不得公开发布。

