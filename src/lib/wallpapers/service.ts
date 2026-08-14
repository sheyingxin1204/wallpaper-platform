import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { requireDatabase } from "@/db";
import {
  licenses,
  sources,
  wallpaperAssets,
  wallpaperAuditLogs,
  wallpaperTags,
  wallpapers,
  users,
} from "@/db/schema";
import type { WallpaperStatus } from "@/lib/wallpapers/status";
import { canTransition } from "@/lib/wallpapers/status";
import { deleteR2Object } from "@/lib/storage/r2";
import { assertCategoryExists, assertTagsExist } from "@/lib/taxonomy/service";

export const requiredAssetKinds = ["original", "preview_1920", "preview_960", "thumbnail_480"] as const;

export type DraftInput = {
  title: string;
  description?: string;
  source?: { name: string; originalUrl: string; author?: string };
  license?: { type: string; evidenceUrl?: string; notes?: string };
  categoryId?: string | null;
  tagIds?: string[];
};

const slugify = (title: string, id: string) => {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalized || "wallpaper"}-${id.slice(0, 8)}`;
};

async function audit(input: {
  wallpaperId: string;
  actorId?: string;
  action: string;
  fromStatus?: WallpaperStatus;
  toStatus?: WallpaperStatus;
  reason?: string;
}) {
  await requireDatabase().insert(wallpaperAuditLogs).values({ id: randomUUID(), ...input });
}

export async function createDraft(actorId: string, title: string, sourceSha256?: string) {
  const id = randomUUID();
  const normalizedTitle = title.trim();
  await requireDatabase().insert(wallpapers).values({
    id,
    title: normalizedTitle,
    slug: slugify(normalizedTitle, id),
    sourceSha256,
    createdBy: actorId,
  });
  await audit({ wallpaperId: id, actorId, action: "draft_created", toStatus: "draft" });
  return id;
}

export async function findDuplicateBySourceSha256(sourceSha256: string) {
  const [wallpaper] = await requireDatabase()
    .select({ id: wallpapers.id, title: wallpapers.title, status: wallpapers.status })
    .from(wallpapers)
    .where(eq(wallpapers.sourceSha256, sourceSha256))
    .limit(1);
  return wallpaper ?? null;
}

export async function updateDraft(id: string, actorId: string, input: DraftInput) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, id)).limit(1);
  if (!wallpaper) throw new Error("壁纸不存在。");
  if (wallpaper.status !== "draft" && wallpaper.status !== "pending_review" && wallpaper.status !== "published") {
    throw new Error("当前状态不能编辑来源与授权信息。");
  }

  let sourceId = wallpaper.sourceId;
  let licenseId = wallpaper.licenseId;
  if (input.source) {
    sourceId ??= randomUUID();
    await db
      .insert(sources)
      .values({ id: sourceId, ...input.source })
      .onDuplicateKeyUpdate({ set: input.source });
  }
  if (input.license) {
    licenseId ??= randomUUID();
    await db
      .insert(licenses)
      .values({ id: licenseId, ...input.license, confirmedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { ...input.license, confirmedAt: new Date() } });
  }

  const title = input.title.trim();
  const canEditTitle = wallpaper.status === "draft";
  const categoryId = input.categoryId === undefined ? wallpaper.categoryId : input.categoryId;
  if (categoryId) await assertCategoryExists(categoryId);
  if (input.tagIds) {
    await assertTagsExist(input.tagIds);
    await db.delete(wallpaperTags).where(eq(wallpaperTags.wallpaperId, id));
    if (input.tagIds.length) {
      await db.insert(wallpaperTags).values(input.tagIds.map((tagId) => ({ wallpaperId: id, tagId })));
    }
  }
  await db
    .update(wallpapers)
    .set({
      title: canEditTitle ? title : wallpaper.title,
      slug: canEditTitle ? slugify(title, id) : wallpaper.slug,
      description: canEditTitle ? input.description?.trim() || null : wallpaper.description,
      sourceId,
      licenseId,
      categoryId: canEditTitle ? categoryId : wallpaper.categoryId,
    })
    .where(eq(wallpapers.id, id));
  await audit({
    wallpaperId: id,
    actorId,
    action: wallpaper.status === "draft" ? "draft_updated" : "attribution_updated",
    fromStatus: wallpaper.status,
    toStatus: wallpaper.status,
  });
}

export async function getAdminWallpapersPage(page: number, pageSize = 50) {
  const db = requireDatabase();
  const safePage = Math.max(page, 1);
  const safeSize = Math.min(Math.max(pageSize, 1), 100);
  const rows = await db
    .select()
    .from(wallpapers)
    .orderBy(desc(wallpapers.createdAt))
    .limit(safeSize + 1)
    .offset((safePage - 1) * safeSize);
  const hasNext = rows.length > safeSize;
  return { items: rows.slice(0, safeSize), hasNext };
}

export async function listAuditLogs(limit = 200) {
  return requireDatabase()
    .select({
      id: wallpaperAuditLogs.id,
      wallpaperId: wallpaperAuditLogs.wallpaperId,
      wallpaperTitle: wallpapers.title,
      actorName: users.name,
      action: wallpaperAuditLogs.action,
      fromStatus: wallpaperAuditLogs.fromStatus,
      toStatus: wallpaperAuditLogs.toStatus,
      reason: wallpaperAuditLogs.reason,
      createdAt: wallpaperAuditLogs.createdAt,
    })
    .from(wallpaperAuditLogs)
    .leftJoin(wallpapers, eq(wallpaperAuditLogs.wallpaperId, wallpapers.id))
    .leftJoin(users, eq(wallpaperAuditLogs.actorId, users.id))
    .orderBy(desc(wallpaperAuditLogs.createdAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}

export async function getPendingProcessingIds(limit = 50) {
  return requireDatabase()
    .select({ id: wallpapers.id })
    .from(wallpapers)
    .where(eq(wallpapers.status, "pending_processing"))
    .orderBy(asc(wallpapers.updatedAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function getAdminWallpaper(id: string) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, id)).limit(1);
  if (!wallpaper) return null;
  const assets = await db.select().from(wallpaperAssets).where(eq(wallpaperAssets.wallpaperId, id));
  const [source] = wallpaper.sourceId ? await db.select().from(sources).where(eq(sources.id, wallpaper.sourceId)).limit(1) : [];
  const [license] = wallpaper.licenseId ? await db.select().from(licenses).where(eq(licenses.id, wallpaper.licenseId)).limit(1) : [];
  const tagRows = await db
    .select({ id: wallpaperTags.tagId })
    .from(wallpaperTags)
    .where(eq(wallpaperTags.wallpaperId, id));
  return { ...wallpaper, assets, source: source ?? null, license: license ?? null, tagIds: tagRows.map((row) => row.id) };
}

export async function setOriginalAsset(input: { wallpaperId: string; storageKey: string; mimeType: string }) {
  const db = requireDatabase();
  const existing = await db
    .select({ id: wallpaperAssets.id })
    .from(wallpaperAssets)
    .where(and(eq(wallpaperAssets.wallpaperId, input.wallpaperId), eq(wallpaperAssets.kind, "original")))
    .limit(1);
  const values = { storageKey: input.storageKey, mimeType: input.mimeType };
  if (existing[0]) {
    await db.update(wallpaperAssets).set(values).where(eq(wallpaperAssets.id, existing[0].id));
  } else {
    await db.insert(wallpaperAssets).values({ id: randomUUID(), wallpaperId: input.wallpaperId, kind: "original", ...values });
  }
}

export async function bindStagingKey(wallpaperId: string, stagingKey: string) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, wallpaperId)).limit(1);
  if (!wallpaper) throw new Error("壁纸不存在。");
  if (wallpaper.status !== "draft") throw new Error("只有草稿可以申请上传。");
  await db.update(wallpapers).set({ stagingKey }).where(eq(wallpapers.id, wallpaperId));
}

export async function consumeStagingKey(wallpaperId: string, expectedKey: string) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, wallpaperId)).limit(1);
  if (!wallpaper) throw new Error("壁纸不存在。");
  if (wallpaper.stagingKey !== expectedKey) throw new Error("上传对象与本草稿的申请不一致，请重新上传。");
  await db.update(wallpapers).set({ stagingKey: null }).where(eq(wallpapers.id, wallpaperId));
  return wallpaper;
}

export async function queueProcessing(id: string, actorId: string) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, id)).limit(1);
  if (!wallpaper) throw new Error("壁纸不存在。");
  if (wallpaper.status !== "draft" && wallpaper.status !== "pending_processing" && wallpaper.status !== "pending_review") {
    throw new Error("当前状态不能进入处理队列。");
  }
  const [original] = await db
    .select()
    .from(wallpaperAssets)
    .where(and(eq(wallpaperAssets.wallpaperId, id), eq(wallpaperAssets.kind, "original")))
    .limit(1);
  if (!original) throw new Error("请先上传原图。");
  await db.update(wallpapers).set({ status: "pending_processing", processingError: null, stagingKey: null }).where(eq(wallpapers.id, id));
  await audit({ wallpaperId: id, actorId, action: "processing_queued", fromStatus: wallpaper.status, toStatus: "pending_processing" });
  return original;
}

export async function transitionWallpaper(input: {
  id: string;
  actorId: string;
  toStatus: WallpaperStatus;
  reason?: string;
}) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, input.id)).limit(1);
  if (!wallpaper) throw new Error("壁纸不存在。");
  if (!canTransition(wallpaper.status, input.toStatus)) throw new Error("不允许的状态变更。");
  if (input.toStatus === "published") {
    if (!wallpaper.sourceId || !wallpaper.licenseId) throw new Error("发布前必须填写来源和授权信息。");
    const assets = await db
      .select({ kind: wallpaperAssets.kind })
      .from(wallpaperAssets)
      .where(and(eq(wallpaperAssets.wallpaperId, input.id), inArray(wallpaperAssets.kind, [...requiredAssetKinds])));
    if (assets.length !== requiredAssetKinds.length) throw new Error("发布前必须完成全部派生图处理。");
    if (wallpaper.sourceSha256) {
      const [duplicate] = await db
        .select({ id: wallpapers.id, title: wallpapers.title })
        .from(wallpapers)
        .where(and(ne(wallpapers.id, input.id), eq(wallpapers.sourceSha256, wallpaper.sourceSha256), inArray(wallpapers.status, ["pending_review", "published", "unlisted"] as const)))
        .limit(1);
      if (duplicate) throw new Error(`检测到与“${duplicate.title}”相同的原始图片，请先确认是否重复。`);
    }
  }
  await db
    .update(wallpapers)
    .set({ status: input.toStatus, publishedAt: input.toStatus === "published" ? new Date() : wallpaper.publishedAt })
    .where(eq(wallpapers.id, input.id));
  await audit({
    wallpaperId: input.id,
    actorId: input.actorId,
    action: `status_changed_to_${input.toStatus}`,
    fromStatus: wallpaper.status,
    toStatus: input.toStatus,
    reason: input.reason?.trim() || undefined,
  });
}

export async function completeProcessing(input: {
  id: string;
  sourceSha256: string;
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
  dominantColor: string;
  assets: Array<{
    kind: (typeof requiredAssetKinds)[number];
    storageKey: string;
    mimeType: string;
    width: number;
    height: number;
    byteSize: number;
    sha256: string;
    perceptualHash?: string;
  }>;
}) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, input.id)).limit(1);
  if (!wallpaper) throw new Error("壁纸不存在。");
  if (wallpaper.status !== "pending_processing") throw new Error("壁纸不在处理队列中。");

  const existingAssets = await db.select().from(wallpaperAssets).where(eq(wallpaperAssets.wallpaperId, input.id));
  for (const asset of input.assets) {
    const current = existingAssets.find((item) => item.kind === asset.kind);
    if (current) {
      await db.update(wallpaperAssets).set(asset).where(eq(wallpaperAssets.id, current.id));
    } else {
      await db.insert(wallpaperAssets).values({ id: randomUUID(), wallpaperId: input.id, ...asset });
    }
  }
  await db
    .update(wallpapers)
    .set({
      status: "pending_review",
      width: input.width,
      height: input.height,
      orientation: input.orientation,
      dominantColor: input.dominantColor,
      sourceSha256: input.sourceSha256,
      processingError: null,
    })
    .where(eq(wallpapers.id, input.id));
  await audit({
    wallpaperId: input.id,
    action: "processing_completed",
    fromStatus: "pending_processing",
    toStatus: "pending_review",
  });
}

export async function markProcessingFailure(id: string, error: string) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, id)).limit(1);
  if (!wallpaper || wallpaper.status !== "pending_processing") return;
  await db.update(wallpapers).set({ processingError: error.slice(0, 4000) }).where(eq(wallpapers.id, id));
  await audit({
    wallpaperId: id,
    action: "processing_failed",
    fromStatus: "pending_processing",
    toStatus: "pending_processing",
    reason: error.slice(0, 4000),
  });
}

export async function deleteWallpaper(id: string) {
  const db = requireDatabase();
  const [wallpaper] = await db.select().from(wallpapers).where(eq(wallpapers.id, id)).limit(1);
  if (!wallpaper) throw new Error("壁纸不存在。");
  if (wallpaper.status === "published" || wallpaper.status === "unlisted") {
    throw new Error("已发布或已下架的壁纸不能删除，请保留审计记录。");
  }
  const assets = await db
    .select({ storageKey: wallpaperAssets.storageKey })
    .from(wallpaperAssets)
    .where(eq(wallpaperAssets.wallpaperId, id));
  await db.delete(wallpapers).where(eq(wallpapers.id, id));
  for (const asset of assets) {
    try {
      await deleteR2Object(asset.storageKey);
    } catch (error) {
      console.warn("Failed to clean up deleted wallpaper asset", error);
    }
  }
}
