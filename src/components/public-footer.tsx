import Link from "next/link";

export function PublicFooter() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return (
    <footer className="border-t border-zinc-800/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-zinc-500 sm:flex-row">
        <p>© {new Date().getFullYear()} 壁纸集 · 所有公开内容均已记录来源与授权</p>
        <div className="flex items-center gap-4">
          {contactEmail && <a href={`mailto:${contactEmail}`} className="underline underline-offset-4 transition hover:text-zinc-300">版权与下架联系</a>}
          <Link href="/" className="transition hover:text-zinc-300">返回首页</Link>
        </div>
      </div>
    </footer>
  );
}
