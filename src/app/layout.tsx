import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallpaper Platform",
  description: "高质量壁纸浏览与下载平台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

