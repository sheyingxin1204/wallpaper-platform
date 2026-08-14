import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { deleteR2Object, headR2Object } from "@/lib/storage/r2";
import { consumeStagingKey, getAdminWallpaper, setOriginalAsset } from "@/lib/wallpapers/service";

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const schema = z.object({ key: z.string().trim().min(1).max(512) });
type Context = { params: Promise<{ wallpaperId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { wallpaperId } = await context.params;
    const { key } = schema.parse(await request.json());
    const wallpaper = await getAdminWallpaper(wallpaperId);
    if (!wallpaper) return NextResponse.json({ error: "壁纸不存在。" }, { status: 404 });
    if (wallpaper.status !== "draft") return NextResponse.json({ error: "只有草稿可以确认原图。" }, { status: 409 });

    const parts = key.split("/");
    if (parts.length !== 6 || parts[0] !== "staging" || parts[3] !== wallpaperId || parts[5] !== "original") {
      return NextResponse.json({ error: "上传对象路径不合法。" }, { status: 400 });
    }
    const object = await headR2Object(key);
    const contentType = object.ContentType?.toLowerCase();
    if (!contentType || !allowedContentTypes.has(contentType) || !object.ContentLength || object.ContentLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "上传对象的 MIME 类型或大小不符合要求。" }, { status: 400 });
    }
    await consumeStagingKey(wallpaperId, key);

    const previous = wallpaper.assets.find((asset) => asset.kind === "original");
    await setOriginalAsset({ wallpaperId, storageKey: key, mimeType: contentType });
    if (previous && previous.storageKey !== key) {
      try {
        await deleteR2Object(previous.storageKey);
      } catch (error) {
        console.warn("Failed to clean up replaced staging object", error);
      }
    }
    return NextResponse.json({ wallpaperId, key, status: "uploaded" });
  } catch (error) {
    return apiError(error);
  }
}
