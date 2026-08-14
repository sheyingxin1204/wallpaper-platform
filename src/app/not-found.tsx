import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-6 text-center text-zinc-100">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-lime-300">404</p>
        <h1 className="mt-4 text-3xl font-semibold">这张壁纸暂时找不到</h1>
        <p className="mt-3 text-sm text-zinc-500">它可能还没有发布，或者已经被下架。</p>
        <Link href="/" className="mt-8 inline-flex rounded-lg bg-lime-300 px-5 py-3 text-sm font-medium text-zinc-950 hover:bg-lime-200">返回首页</Link>
      </div>
    </main>
  );
}
