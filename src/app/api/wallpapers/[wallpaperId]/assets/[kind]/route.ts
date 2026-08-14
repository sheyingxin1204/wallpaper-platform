import { NextResponse } from "next/server";
import { assetKinds } from "@/db/schema";
import { createR2DownloadUrl, publicAssetUrl } from "@/lib/storage/r2";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getPublishedAsset, incrementWallpaperDownload } from "@/lib/wallpapers/public-service";

type Context = { params: Promise<{ wallpaperId: string; kind: string }> };

function isAssetKind(value: string): value is (typeof assetKinds)[number] {
  return assetKinds.includes(value as (typeof assetKinds)[number]);
}

// Presigned URLs expire after 10 minutes, so the redirect itself must never be
// cached by Cloudflare or any upstream proxy.
function redirect(url: string) {
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, context: Context) {
  const limit = rateLimit(request, "wallpaper-asset", 120, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const { wallpaperId, kind } = await context.params;
  if (!isAssetKind(kind)) return NextResponse.json({ error: "图片版本不存在。" }, { status: 404 });

  const asset = await getPublishedAsset(wallpaperId, kind);
  if (!asset) return NextResponse.json({ error: "壁纸不存在或尚未发布。" }, { status: 404 });

  try {
    const download = new URL(request.url).searchParams.get("download") === "1";
    // Originals live under the private `staging/` prefix and must always use
    // short-lived presigned URLs; only derived variants may use a public domain.
    const publicUrl = download || kind === "original" ? null : publicAssetUrl(asset.storageKey);
    if (publicUrl) return redirect(publicUrl);
    // Only original downloads count towards download stats, and only once per
    // client within the rolling window so refresh spam cannot inflate numbers.
    if (kind === "original" && download) {
      const downloadLimit = rateLimit(request, `wallpaper-download:${wallpaperId}`, 3, 10 * 60_000);
      if (downloadLimit.allowed) void incrementWallpaperDownload(wallpaperId).catch(() => {});
    }
    const url = await createR2DownloadUrl({
      key: asset.storageKey,
      expiresInSeconds: 10 * 60,
      contentType: asset.mimeType,
      ...(download ? { downloadFilename: `${asset.title || "wallpaper"}.webp` } : {}),
    });
    return redirect(url);
  } catch (error) {
    console.error("Failed to create wallpaper asset URL", error);
    return NextResponse.json({ error: "图片暂时无法访问。" }, { status: 503 });
  }
}
