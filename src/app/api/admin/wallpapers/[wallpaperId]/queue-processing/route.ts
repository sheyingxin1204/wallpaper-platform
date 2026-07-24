import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { headR2Object } from "@/lib/storage/r2";
import { getAdminWallpaper, queueProcessing } from "@/lib/wallpapers/service";

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
type Context = { params: Promise<{ wallpaperId: string }> };

export async function POST(_: Request, context: Context) {
  try {
    const admin = await requireAdmin();
    const { wallpaperId } = await context.params;
    const wallpaper = await getAdminWallpaper(wallpaperId);
    const original = wallpaper?.assets.find((asset) => asset.kind === "original");
    if (!original) throw new Error("请先上传原图。");
    const object = await headR2Object(original.storageKey);
    const contentType = object.ContentType?.toLowerCase();
    if (!contentType || !allowedContentTypes.has(contentType) || !object.ContentLength || object.ContentLength > MAX_UPLOAD_BYTES) {
      throw new Error("上传对象的 MIME 类型或大小不符合要求。");
    }
    await queueProcessing(wallpaperId, admin.id);
    return NextResponse.json({ status: "pending_processing", wallpaperId });
  } catch (error) {
    return apiError(error);
  }
}
