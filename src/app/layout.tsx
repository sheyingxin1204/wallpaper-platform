import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallpaper Platform",
  description: "高质量壁纸浏览与下载平台",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
