"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-6 text-center text-zinc-100">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-red-300">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-semibold">页面暂时无法加载</h1>
        <p className="mt-3 text-sm text-zinc-500">请稍后重试；如果问题持续存在，请检查数据库和对象存储配置。</p>
        <button type="button" onClick={() => reset()} className="mt-8 rounded-lg bg-lime-300 px-5 py-3 text-sm font-medium text-zinc-950 hover:bg-lime-200">重新加载</button>
      </div>
    </main>
  );
}
