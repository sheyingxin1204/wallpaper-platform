import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { createR2UploadUrl, deleteR2Object } from "@/lib/storage/r2";
import { bindStagingKey, getAdminWallpaper } from "@/lib/wallpapers/service";

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const uploadSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentLength: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
type Context = { params: Promise<{ wallpaperId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { wallpaperId } = await context.params;
    const { contentType, contentLength } = uploadSchema.parse(await request.json());
    const wallpaper = await getAdminWallpaper(wallpaperId);
    if (!wallpaper) return NextResponse.json({ error: "壁纸不存在。" }, { status: 404 });
    if (wallpaper.status !== "draft") return NextResponse.json({ error: "只有草稿可以上传原图。" }, { status: 409 });

    const timestamp = new Date();
    const key = `staging/${timestamp.getUTCFullYear()}/${String(timestamp.getUTCMonth() + 1).padStart(2, "0")}/${wallpaperId}/${randomUUID()}/original`;
    const uploadUrl = await createR2UploadUrl({ key, contentType, contentLength, expiresInSeconds: 10 * 60 });
    // A previous upload URL may have been issued but never confirmed; drop that
    // orphan object before binding the fresh key.
    if (wallpaper.stagingKey) {
      try {
        await deleteR2Object(wallpaper.stagingKey);
      } catch (error) {
        console.warn("Failed to clean up replaced staging key", error);
      }
    }
    await bindStagingKey(wallpaperId, key);
    return NextResponse.json({ key, uploadUrl, expiresInSeconds: 600 });
  } catch (error) {
    return apiError(error);
  }
}
