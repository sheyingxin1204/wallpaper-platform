# 采集器

该目录用于 Node.js + Playwright 采集任务。采集器不在 Next.js 请求中执行，后续由 GitHub Actions 定时或手动触发。

只允许为已确认可转载、可商用或已获授权的来源编写 Provider。每条素材必须记录来源页面、作者和授权信息，并先以 `pending_review` 状态进入后台审核。

当前提供的是受控的 JSON 清单导入入口，不能把任意 URL 当作采集目标：

```powershell
pnpm crawler --manifest .\scripts\crawler\examples\manifest.json --dry-run
```

真实导入前需要在 `.env.local` 配置 `CRAWLER_ALLOWED_HOSTS`，并确保清单中的页面和图片域名都在允许列表内。导入会创建待处理的壁纸草稿，随后仍然需要运行 `pnpm processor <wallpaper-id>` 并由管理员审核发布。
