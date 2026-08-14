import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { parseColorMode, parseResolutionPreset, resolutionPresets } from "@/lib/wallpapers/filters";
import { getPublishedCategories, getPublishedWallpapers } from "@/lib/wallpapers/public-service";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQuery(input: { query?: string; orientation?: string; category?: string; resolution?: string; color?: string; page?: number }) {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.orientation) params.set("orientation", input.orientation);
  if (input.category) params.set("category", input.category);
  if (input.resolution) params.set("resolution", input.resolution);
  if (input.color) params.set("color", input.color);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Search, filter and pagination views are low-value duplicates of the same
// content; keeping them out of the index avoids thin/duplicate pages.
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const filtered = Object.entries(params).some(([key, value]) => key !== "page" && Boolean(value)) || Number.parseInt(first(params.page) ?? "1", 10) > 1;
  return filtered ? { robots: { index: false, follow: true } } : {};
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = first(params.q)?.trim() || "";
  const orientationValue = first(params.orientation);
  const orientation = orientationValue === "landscape" || orientationValue === "portrait" || orientationValue === "square" ? orientationValue : undefined;
  const category = first(params.category)?.trim() || undefined;
  const resolution = parseResolutionPreset(first(params.resolution));
  const color = parseColorMode(first(params.color));
  const pageValue = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const [result, categories] = await Promise.all([
    getPublishedWallpapers({ query, orientation, category, minWidth: resolution?.minWidth, minHeight: resolution?.minHeight, colorMode: color, page }),
    getPublishedCategories(),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">壁纸集</Link>
          <Link href="/admin" className="text-sm text-zinc-400 transition hover:text-white">管理后台</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-16">
        <p className="text-sm uppercase tracking-[0.28em] text-lime-300">Wallpaper Platform</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">把喜欢的画面，留在每一次打开屏幕时。</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">精选、整理并记录来源的高质量壁纸。所有公开内容都经过处理和审核。</p>

        <form className="mt-10 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 md:grid-cols-[1fr_150px_150px_150px_130px_auto]" action="/" method="get">
          <label className="sr-only" htmlFor="q">搜索标题</label>
          <input id="q" name="q" defaultValue={query} placeholder="搜索壁纸标题" className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-lime-300" />
          <label className="sr-only" htmlFor="orientation">方向</label>
          <select id="orientation" name="orientation" defaultValue={orientation ?? ""} className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-lime-300">
            <option value="">全部方向</option>
            <option value="landscape">横屏</option>
            <option value="portrait">竖屏</option>
            <option value="square">方形</option>
          </select>
          <label className="sr-only" htmlFor="category">分类</label>
          <select id="category" name="category" defaultValue={category ?? ""} className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-lime-300">
            <option value="">全部分类</option>
            {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="resolution">分辨率</label>
          <select id="resolution" name="resolution" defaultValue={resolution?.value ?? ""} className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-lime-300">
            <option value="">全部分辨率</option>
            {resolutionPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="color">色彩</label>
          <select id="color" name="color" defaultValue={color ?? ""} className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-lime-300">
            <option value="">全部色彩</option>
            <option value="dark">深色</option>
            <option value="light">浅色</option>
          </select>
          <button type="submit" className="rounded-lg bg-lime-300 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-lime-200">搜索</button>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium">最新发布</h2>
            <p className="mt-1 text-sm text-zinc-500">{query ? `正在搜索“${query}”` : "持续收集值得保存的画面"}</p>
          </div>
          {page > 1 && <Link href={`/${buildQuery({ query, orientation, category, resolution: resolution?.value, color, page: page - 1 })}`} className="text-sm text-zinc-400 hover:text-white">返回上一页</Link>}
        </div>

        {result.items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map((item) => {
              const image = item.assets.find((asset) => asset.kind === "thumbnail_480");
              return (
                <Link key={item.id} href={`/wallpapers/${item.slug}`} className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition hover:-translate-y-1 hover:border-zinc-600">
                  <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                    {image ? <Image src={`/api/wallpapers/${item.id}/assets/thumbnail_480`} alt={item.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 25vw, 320px" className="object-cover transition duration-500 group-hover:scale-105" unoptimized /> : <div className="grid h-full place-items-center text-sm text-zinc-600">暂无预览</div>}
                  </div>
                  <div className="p-4">
                    <h3 className="truncate font-medium">{item.title}</h3>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
                      <span>{item.category?.name ?? "未分类"}</span>
                      <span>{item.width && item.height ? `${item.width} × ${item.height}` : ""}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
            <p className="text-lg text-zinc-300">暂时没有符合条件的已发布壁纸</p>
            <p className="mt-2 text-sm text-zinc-500">完成第一张壁纸审核后，它会出现在这里。</p>
          </div>
        )}

        {(page > 1 || result.hasNext) && <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label="分页">
          {page > 1 && <Link href={`/${buildQuery({ query, orientation, category, resolution: resolution?.value, color, page: page - 1 })}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-zinc-500">上一页</Link>}
          <span className="text-zinc-500">第 {page} 页</span>
          {result.hasNext && <Link href={`/${buildQuery({ query, orientation, category, resolution: resolution?.value, color, page: page + 1 })}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:border-zinc-500">下一页</Link>}
        </nav>}
      </section>
    </main>
  );
}
