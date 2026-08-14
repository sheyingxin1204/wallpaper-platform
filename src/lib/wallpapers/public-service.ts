import { and, desc, eq, inArray, like } from "drizzle-orm";
import { isDatabaseConfigured, requireDatabase } from "@/db";
import { assetKinds, categories, licenses, sources, tags, wallpaperAssets, wallpaperTags, wallpapers } from "@/db/schema";

export type PublicAssetKind = (typeof assetKinds)[number];

export type PublicWallpaperCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  orientation: "landscape" | "portrait" | "square" | null;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  category: { name: string; slug: string } | null;
  assets: Array<{ kind: PublicAssetKind; width: number | null; height: number | null }>;
};

export type PublicWallpaperDetail = PublicWallpaperCard & {
  publishedAt: Date | null;
  source: { name: string; originalUrl: string; author: string | null } | null;
  license: { type: string; evidenceUrl: string | null; notes: string | null } | null;
  tags: Array<{ name: string; slug: string }>;
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const assetMap = (assets: Array<{ kind: PublicAssetKind; width: number | null; height: number | null }>) => assets;

export async function getPublishedWallpapers(input: {
  query?: string;
  orientation?: "landscape" | "portrait" | "square";
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  if (!isDatabaseConfigured()) return { items: [] as PublicWallpaperCard[], hasNext: false };

  const db = requireDatabase();
  const pageSize = Math.min(Math.max(input.pageSize ?? 24, 1), 60);
  const page = Math.max(input.page ?? 1, 1);
  const conditions = [eq(wallpapers.status, "published" as const)];
  if (input.query?.trim()) conditions.push(like(wallpapers.title, `%${escapeLike(input.query.trim())}%`));
  if (input.orientation) conditions.push(eq(wallpapers.orientation, input.orientation));
  if (input.category) conditions.push(eq(categories.slug, input.category));

  const rows = await db
    .select({
      id: wallpapers.id,
      slug: wallpapers.slug,
      title: wallpapers.title,
      description: wallpapers.description,
      orientation: wallpapers.orientation,
      width: wallpapers.width,
      height: wallpapers.height,
      dominantColor: wallpapers.dominantColor,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(wallpapers)
    .leftJoin(categories, eq(wallpapers.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(wallpapers.publishedAt), desc(wallpapers.createdAt))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const hasNext = rows.length > pageSize;
  const visibleRows = rows.slice(0, pageSize);
  if (!visibleRows.length) return { items: [] as PublicWallpaperCard[], hasNext };

  const ids = visibleRows.map((row) => row.id);
  const assets = await db
    .select({ wallpaperId: wallpaperAssets.wallpaperId, kind: wallpaperAssets.kind, width: wallpaperAssets.width, height: wallpaperAssets.height })
    .from(wallpaperAssets)
    .where(and(inArray(wallpaperAssets.wallpaperId, ids), inArray(wallpaperAssets.kind, ["preview_1920", "thumbnail_480"] as const)));
  const assetsByWallpaper = new Map<string, Array<{ kind: PublicAssetKind; width: number | null; height: number | null }>>();
  for (const asset of assets) {
    const current = assetsByWallpaper.get(asset.wallpaperId) ?? [];
    current.push({ kind: asset.kind, width: asset.width, height: asset.height });
    assetsByWallpaper.set(asset.wallpaperId, current);
  }

  return {
    items: visibleRows.map((row) => ({
      ...row,
      category: row.categoryName && row.categorySlug ? { name: row.categoryName, slug: row.categorySlug } : null,
      assets: assetMap(assetsByWallpaper.get(row.id) ?? []),
    })),
    hasNext,
  };
}

export async function getPublishedWallpaperBySlug(slug: string): Promise<PublicWallpaperDetail | null> {
  if (!isDatabaseConfigured()) return null;
  const db = requireDatabase();
  const [row] = await db
    .select({
      id: wallpapers.id,
      slug: wallpapers.slug,
      title: wallpapers.title,
      description: wallpapers.description,
      orientation: wallpapers.orientation,
      width: wallpapers.width,
      height: wallpapers.height,
      dominantColor: wallpapers.dominantColor,
      publishedAt: wallpapers.publishedAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
      sourceName: sources.name,
      sourceUrl: sources.originalUrl,
      sourceAuthor: sources.author,
      licenseType: licenses.type,
      licenseEvidenceUrl: licenses.evidenceUrl,
      licenseNotes: licenses.notes,
    })
    .from(wallpapers)
    .leftJoin(categories, eq(wallpapers.categoryId, categories.id))
    .leftJoin(sources, eq(wallpapers.sourceId, sources.id))
    .leftJoin(licenses, eq(wallpapers.licenseId, licenses.id))
    .where(and(eq(wallpapers.slug, slug), eq(wallpapers.status, "published" as const)))
    .limit(1);

  if (!row) return null;

  const assets = await db
    .select({ kind: wallpaperAssets.kind, width: wallpaperAssets.width, height: wallpaperAssets.height })
    .from(wallpaperAssets)
    .where(eq(wallpaperAssets.wallpaperId, row.id));
  const wallpaperTagsRows = await db
    .select({ name: tags.name, slug: tags.slug })
    .from(wallpaperTags)
    .innerJoin(tags, eq(wallpaperTags.tagId, tags.id))
    .where(eq(wallpaperTags.wallpaperId, row.id));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    orientation: row.orientation,
    width: row.width,
    height: row.height,
    dominantColor: row.dominantColor,
    publishedAt: row.publishedAt,
    category: row.categoryName && row.categorySlug ? { name: row.categoryName, slug: row.categorySlug } : null,
    assets,
    source: row.sourceName && row.sourceUrl ? { name: row.sourceName, originalUrl: row.sourceUrl, author: row.sourceAuthor } : null,
    license: row.licenseType
      ? { type: row.licenseType, evidenceUrl: row.licenseEvidenceUrl, notes: row.licenseNotes }
      : null,
    tags: wallpaperTagsRows,
  };
}

export async function getPublishedAsset(wallpaperId: string, kind: PublicAssetKind) {
  if (!isDatabaseConfigured()) return null;
  const db = requireDatabase();
  const [row] = await db
    .select({
      wallpaperId: wallpapers.id,
      slug: wallpapers.slug,
      title: wallpapers.title,
      status: wallpapers.status,
      storageKey: wallpaperAssets.storageKey,
      mimeType: wallpaperAssets.mimeType,
    })
    .from(wallpaperAssets)
    .innerJoin(wallpapers, eq(wallpaperAssets.wallpaperId, wallpapers.id))
    .where(and(eq(wallpapers.id, wallpaperId), eq(wallpapers.status, "published" as const), eq(wallpaperAssets.kind, kind)))
    .limit(1);
  return row ?? null;
}

export async function getPublishedSlugs() {
  if (!isDatabaseConfigured()) return [] as Array<{ slug: string; updatedAt: Date }>;
  const db = requireDatabase();
  return db
    .select({ slug: wallpapers.slug, updatedAt: wallpapers.updatedAt })
    .from(wallpapers)
    .where(eq(wallpapers.status, "published" as const))
    .orderBy(desc(wallpapers.publishedAt));
}
