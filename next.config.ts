import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${process.env.R2_PUBLIC_BASE_URL ? new URL(process.env.R2_PUBLIC_BASE_URL).origin : ""}; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Image work is intentionally done by the Node.js processor. Keeping Next's
  // request-time optimizer disabled means the app never calls Sharp at runtime;
  // the OpenNext bundle patch keeps Sharp out of the Worker entirely.
  images: { loader: "custom", loaderFile: "./src/lib/image-loader.ts", unoptimized: true },
  outputFileTracingExcludes: {
    "*": ["**/node_modules/sharp/**", "**/node_modules/@img/**"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
