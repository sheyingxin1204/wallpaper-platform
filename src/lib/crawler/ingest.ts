import { createHash, randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { requireDatabase } from "@/db";
import { users } from "@/db/schema";
import { assertCrawlerUrlAllowed } from "@/lib/crawler/allowlist";
import type { CrawlCandidate } from "@/lib/crawler/types";
import { deleteR2Object, writeR2Object } from "@/lib/storage/r2";
import {
  createDraft,
  findDuplicateBySourceSha256,
  queueProcessing,
  setOriginalAsset,
  updateDraft,
} from "@/lib/wallpapers/service";
import { createCrawlRecord, markCrawlRecordDuplicate, markCrawlRecordFailed, markCrawlRecordImported } from "@/lib/crawler/service";

const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");

async function findCrawlerActor() {
  const [actor] = await requireDatabase()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.disabled, false))
    .orderBy(asc(users.createdAt))
    .limit(1);
  if (!actor) throw new Error("采集前必须先创建一个可用的管理员账号。");
  return actor.id;
}

async function downloadCandidate(candidate: CrawlCandidate) {
  assertCrawlerUrlAllowed(candidate.pageUrl);
  assertCrawlerUrlAllowed(candidate.imageUrl);
  const response = await fetch(candidate.imageUrl, {
    headers: { "User-Agent": process.env.CRAWLER_USER_AGENT ?? "WallpaperPlatformCrawler/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`图片下载失败：HTTP ${response.status}。`);
  assertCrawlerUrlAllowed(response.url);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_INPUT_BYTES) throw new Error("图片超过 30MB 限制。");
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
  if (!contentType || !allowedContentTypes.has(contentType)) throw new Error("来源图片不是支持的 JPEG、PNG 或 WebP。 ");
  const body = Buffer.from(await response.arrayBuffer());
  if (!body.length || body.byteLength > MAX_INPUT_BYTES) throw new Error("图片大小不符合要求。");
  return { body, contentType, sourceSha256: sha256(body) };
}

function stagingKey(wallpaperId: string) {
  const now = new Date();
  return `staging/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${wallpaperId}/${randomUUID()}/original`;
}

export async function importCrawlCandidates(taskId: string, candidates: CrawlCandidate[]) {
  const actorId = await findCrawlerActor();
  let importedCount = 0;
  let duplicateCount = 0;

  for (const candidate of candidates) {
    const recordId = await createCrawlRecord(taskId, candidate);
    let uploadedKey: string | undefined;
    try {
      const downloaded = await downloadCandidate(candidate);
      const duplicate = await findDuplicateBySourceSha256(downloaded.sourceSha256);
      if (duplicate) {
        await markCrawlRecordDuplicate({ id: recordId, wallpaperId: duplicate.id, sourceSha256: downloaded.sourceSha256 });
        duplicateCount += 1;
        continue;
      }

      const wallpaperId = await createDraft(actorId, candidate.title, downloaded.sourceSha256);
      await updateDraft(wallpaperId, actorId, {
        title: candidate.title,
        description: candidate.description,
        source: { name: candidate.sourceName, originalUrl: candidate.pageUrl, author: candidate.author },
        license: candidate.license,
      });
      uploadedKey = stagingKey(wallpaperId);
      await writeR2Object({ key: uploadedKey, body: downloaded.body, contentType: downloaded.contentType });
      await setOriginalAsset({ wallpaperId, storageKey: uploadedKey, mimeType: downloaded.contentType });
      await queueProcessing(wallpaperId, actorId);
      // From here the wallpaper owns the object; a record-update failure must
      // not delete it or the queued wallpaper would be permanently broken.
      uploadedKey = undefined;
      await markCrawlRecordImported({ id: recordId, wallpaperId, sourceSha256: downloaded.sourceSha256 });
      importedCount += 1;
    } catch (error) {
      if (uploadedKey) {
        try {
          await deleteR2Object(uploadedKey);
        } catch (cleanupError) {
          console.warn("Failed to clean up failed crawler upload", cleanupError);
        }
      }
      await markCrawlRecordFailed(recordId, error instanceof Error ? error.message : "未知采集错误。");
    }
  }

  return { importedCount, duplicateCount };
}
