export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-6 text-zinc-100">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="size-4 animate-spin rounded-full border-2 border-zinc-700 border-t-lime-300" aria-hidden />
        正在加载壁纸
      </div>
    </main>
  );
}
