import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/wallpapers/public-service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const slugs = await getPublishedSlugs();
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    ...slugs.map((item) => ({ url: `${siteUrl}/wallpapers/${item.slug}`, lastModified: item.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
