import { createHash } from "node:crypto";
import sharp from "sharp";
import { deleteR2Object, readR2Object, writeR2Object } from "@/lib/storage/r2";
import { completeProcessing, getAdminWallpaper, markProcessingFailure } from "@/lib/wallpapers/service";

const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const MAX_INPUT_PIXELS = 64_000_000;

const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");

async function differenceHash(input: Buffer) {
  const pixels = await sharp(input).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

function assetKey(wallpaperId: string, filename: string) {
  const date = new Date();
  return `wallpapers/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${wallpaperId}/${filename}`;
}

export async function processWallpaper(wallpaperId: string) {
  const wallpaper = await getAdminWallpaper(wallpaperId);
  if (!wallpaper) throw new Error("壁纸不存在。");
  if (wallpaper.status !== "pending_processing") throw new Error("壁纸不在处理队列中。");
  const original = wallpaper.assets.find((asset) => asset.kind === "original");
  if (!original) throw new Error("找不到暂存原图。");

  try {
    const source = await readR2Object(original.storageKey);
    if (source.byteLength > MAX_INPUT_BYTES) throw new Error("原图超过 30MB 限制。");
    const metadata = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
      throw new Error("只支持 JPEG、PNG 或 WebP 图片。");
    }
    if (metadata.width * metadata.height > MAX_INPUT_PIXELS) throw new Error("原图像素超过 6400 万限制。");

    const orientation = metadata.width === metadata.height ? "square" : metadata.width > metadata.height ? "landscape" : "portrait";
    const color = await sharp(source).rotate().resize(1, 1, { fit: "cover" }).removeAlpha().raw().toBuffer();
    const dominantColor = `#${[color[0], color[1], color[2]].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    const perceptualHash = await differenceHash(source);
    const variants = [
      { kind: "original" as const, filename: "original.webp", width: undefined, quality: 92 },
      { kind: "preview_1920" as const, filename: "preview-1920.webp", width: 1920, quality: 86 },
      { kind: "preview_960" as const, filename: "preview-960.webp", width: 960, quality: 84 },
      { kind: "thumbnail_480" as const, filename: "thumbnail-480.webp", width: 480, quality: 80 },
    ];
    const processedAssets = [];
    for (const variant of variants) {
      const image = sharp(source).rotate();
      if (variant.width) image.resize({ width: variant.width, withoutEnlargement: true });
      const body = await image.webp({ quality: variant.quality }).toBuffer();
      const info = await sharp(body).metadata();
      const storageKey = assetKey(wallpaperId, variant.filename);
      await writeR2Object({ key: storageKey, body, contentType: "image/webp" });
      processedAssets.push({
        kind: variant.kind,
        storageKey,
        mimeType: "image/webp",
        width: info.width ?? metadata.width,
        height: info.height ?? metadata.height,
        byteSize: body.byteLength,
        sha256: sha256(body),
        perceptualHash,
      });
    }
    await completeProcessing({
      id: wallpaperId,
      sourceSha256: sha256(source),
      width: metadata.width,
      height: metadata.height,
      orientation,
      dominantColor,
      assets: processedAssets,
    });
    try {
      await deleteR2Object(original.storageKey);
    } catch (cleanupError) {
      console.warn("Processed wallpaper but could not delete staging object", cleanupError);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知图片处理错误。";
    await markProcessingFailure(wallpaperId, message);
    throw error;
  }
}
