import { NextResponse } from "next/server";
import { assetKinds } from "@/db/schema";
import { createR2DownloadUrl } from "@/lib/storage/r2";
import { getPublishedAsset } from "@/lib/wallpapers/public-service";

type Context = { params: Promise<{ wallpaperId: string; kind: string }> };

function isAssetKind(value: string): value is (typeof assetKinds)[number] {
  return assetKinds.includes(value as (typeof assetKinds)[number]);
}

export async function GET(request: Request, context: Context) {
  const { wallpaperId, kind } = await context.params;
  if (!isAssetKind(kind)) return NextResponse.json({ error: "图片版本不存在。" }, { status: 404 });

  const asset = await getPublishedAsset(wallpaperId, kind);
  if (!asset) return NextResponse.json({ error: "壁纸不存在或尚未发布。" }, { status: 404 });

  try {
    const download = new URL(request.url).searchParams.get("download") === "1";
    const url = await createR2DownloadUrl({
      key: asset.storageKey,
      expiresInSeconds: 10 * 60,
      contentType: asset.mimeType,
      ...(download ? { downloadFilename: `${asset.title || "wallpaper"}.webp` } : {}),
    });
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Failed to create wallpaper asset URL", error);
    return NextResponse.json({ error: "图片暂时无法访问。" }, { status: 503 });
  }
}
