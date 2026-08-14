import { chromium } from "playwright";
import { assertCrawlerUrlAllowed } from "@/lib/crawler/allowlist";
import type { CrawlCandidate, SelectorManifest } from "@/lib/crawler/types";

const text = async (locator: ReturnType<import("playwright").Page["locator"]>) => {
  const value = await locator.first().textContent().catch(() => null);
  return value?.trim() || undefined;
};

const imageSource = async (locator: ReturnType<import("playwright").Page["locator"]>) => {
  const image = locator.first();
  const source = (await image.getAttribute("src")) || (await image.getAttribute("data-src")) || (await image.getAttribute("data-lazy-src"));
  if (source) return source;
  const srcset = await image.getAttribute("srcset");
  return srcset?.split(",")[0]?.trim().split(/\s+/)[0];
};

export async function collectWithPlaywright(manifest: SelectorManifest): Promise<CrawlCandidate[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: process.env.CRAWLER_USER_AGENT ?? "WallpaperPlatformCrawler/1.0",
    // Only for controlled tests against self-signed local sources; production
    // sources must use valid HTTPS certificates.
    ignoreHTTPSErrors: process.env.CRAWLER_IGNORE_INSECURE_CERT === "true",
  });
  const candidates: CrawlCandidate[] = [];
  try {
    for (const config of manifest.pages) {
      assertCrawlerUrlAllowed(config.url);
      const page = await context.newPage();
      try {
        await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const items = page.locator(config.itemSelector);
        const count = Math.min(await items.count(), config.maxItems);
        for (let index = 0; index < count; index += 1) {
          const item = items.nth(index);
          const source = await imageSource(item.locator(config.imageSelector));
          if (!source) continue;
          const imageUrl = new URL(source, page.url()).toString();
          assertCrawlerUrlAllowed(imageUrl);
          const title = (config.titleSelector ? await text(item.locator(config.titleSelector)) : undefined) || (await item.locator(config.imageSelector).first().getAttribute("alt"))?.trim();
          if (!title) continue;
          candidates.push({
            pageUrl: page.url(),
            imageUrl,
            title: title.slice(0, 200),
            description: config.descriptionSelector ? await text(item.locator(config.descriptionSelector)) : undefined,
            sourceName: config.sourceName,
            author: config.authorSelector ? await text(item.locator(config.authorSelector)) : undefined,
            license: config.license,
            capturedAt: new Date(),
          });
          if (config.delayMs) await new Promise((resolve) => setTimeout(resolve, config.delayMs));
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
  return candidates;
}
