import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { generateVariants } from "@/lib/wallpapers/processor";

test("generateVariants produces all required webp variants with correct sizes", async () => {
  const source = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: { r: 18, g: 200, b: 120 } } })
    .png()
    .toBuffer();

  const variants = await generateVariants(source);
  assert.equal(variants.length, 4);
  assert.deepEqual(
    variants.map((variant) => variant.kind),
    ["original", "preview_1920", "preview_960", "thumbnail_480"],
  );

  const original = variants.find((variant) => variant.kind === "original")!;
  const preview1920 = variants.find((variant) => variant.kind === "preview_1920")!;
  const thumbnail = variants.find((variant) => variant.kind === "thumbnail_480")!;
  assert.equal(original.width, 2000);
  assert.equal(original.height, 1000);
  assert.equal(preview1920.width, 1920);
  assert.equal(preview1920.height, 960);
  assert.equal(thumbnail.width, 480);
  assert.equal(thumbnail.height, 240);

  for (const variant of variants) {
    assert.equal(variant.byteSize, variant.body.byteLength);
    assert.equal(variant.sha256.length, 64);
    assert.equal(variant.perceptualHash.length, 16);
    const info = await sharp(variant.body).metadata();
    assert.equal(info.format, "webp");
  }
});

test("generateVariants rejects unsupported image formats", async () => {
  await assert.rejects(generateVariants(Buffer.from("not an image")), /只支持/);
});
