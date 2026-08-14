"use client";

import Image from "next/image";
import { useState } from "react";

export function WallpaperImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="grid h-full w-full place-items-center bg-zinc-900 p-6 text-center text-sm text-zinc-500">图片暂时无法加载，请稍后重试。</div>;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} unoptimized priority={priority} onError={() => setFailed(true)} />;
}
