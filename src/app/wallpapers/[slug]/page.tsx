import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedWallpaperBySlug } from "@/lib/wallpapers/public-service";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { slug } = await params;
  const wallpaper = await getPublishedWallpaperBySlug(slug);
  if (!wallpaper) return { title: "壁纸不存在" };
  return {
    title: `${wallpaper.title} · 壁纸集`,
    description: wallpaper.description ?? `${wallpaper.title} 高清壁纸`,
    openGraph: {
      title: wallpaper.title,
      description: wallpaper.description ?? undefined,
      type: "article",
      images: [{ url: `/api/wallpapers/${wallpaper.id}/assets/preview_1920`, alt: wallpaper.title }],
    },
  };
}

export default async function WallpaperDetailPage({ params }: Context) {
  const { slug } = await params;
  const wallpaper = await getPublishedWallpaperBySlug(slug);
  if (!wallpaper) notFound();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">壁纸集</Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">返回首页</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 lg:min-h-[620px]">
            <Image src={`/api/wallpapers/${wallpaper.id}/assets/preview_1920`} alt={wallpaper.title} fill sizes="(max-width: 1024px) 100vw, 70vw" className="object-contain" unoptimized priority />
          </div>
        </section>

        <aside className="lg:pt-4">
          <p className="text-sm uppercase tracking-[0.2em] text-lime-300">Wallpaper</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{wallpaper.title}</h1>
          {wallpaper.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-zinc-400">{wallpaper.description}</p>}

          <dl className="mt-8 grid gap-4 border-y border-zinc-800 py-6 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">尺寸</dt><dd>{wallpaper.width && wallpaper.height ? `${wallpaper.width} × ${wallpaper.height}` : "未知"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">方向</dt><dd>{wallpaper.orientation === "landscape" ? "横屏" : wallpaper.orientation === "portrait" ? "竖屏" : wallpaper.orientation === "square" ? "方形" : "未知"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">分类</dt><dd>{wallpaper.category?.name ?? "未分类"}</dd></div>
          </dl>

          <div className="mt-8 grid gap-3">
            <a href={`/api/wallpapers/${wallpaper.id}/assets/original?download=1`} className="rounded-lg bg-lime-300 px-5 py-3 text-center text-sm font-medium text-zinc-950 transition hover:bg-lime-200">下载原图</a>
            <a href={`/api/wallpapers/${wallpaper.id}/assets/preview_1920?download=1`} className="rounded-lg border border-zinc-700 px-5 py-3 text-center text-sm text-zinc-200 transition hover:border-zinc-500">下载 1920 预览图</a>
          </div>

          {(wallpaper.source || wallpaper.license) && <div className="mt-8 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
            <p className="font-medium text-zinc-300">来源与授权</p>
            {wallpaper.source && <p className="mt-3 leading-6">来源：<a href={wallpaper.source.originalUrl} target="_blank" rel="noreferrer" className="text-zinc-300 underline underline-offset-4 hover:text-white">{wallpaper.source.name}</a>{wallpaper.source.author ? ` · ${wallpaper.source.author}` : ""}</p>}
            {wallpaper.license && <p className="mt-2 leading-6">授权：{wallpaper.license.type}</p>}
          </div>}
        </aside>
      </div>
    </main>
  );
}
