const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/^\.+/, "");

export function getCrawlerAllowedHosts() {
  return (process.env.CRAWLER_ALLOWED_HOSTS ?? "")
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);
}

export function assertCrawlerUrlAllowed(rawUrl: string, allowedHosts = getCrawlerAllowedHosts()) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("采集来源必须使用 HTTPS。");
  if (!allowedHosts.length) throw new Error("请先配置 CRAWLER_ALLOWED_HOSTS，再执行真实采集。");
  const host = normalizeHost(url.hostname);
  const allowed = allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
  if (!allowed) throw new Error(`来源域名 ${host} 不在 CRAWLER_ALLOWED_HOSTS 允许列表中。`);
  return url;
}
