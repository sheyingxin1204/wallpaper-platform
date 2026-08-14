import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { isDatabaseConfigured } from "@/db";
import { auth, authConfigurationError } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);

function unavailable() {
  return NextResponse.json({ error: "生产环境必须配置 BETTER_AUTH_SECRET。" }, { status: 503 });
}

function databaseUnavailable() {
  return NextResponse.json({ error: "数据库未配置，认证服务暂不可用。" }, { status: 503 });
}

export async function GET(request: Request) {
  if (authConfigurationError) return unavailable();
  if (!isDatabaseConfigured()) return databaseUnavailable();
  return handler.GET(request);
}

export async function POST(request: Request) {
  if (authConfigurationError) return unavailable();
  if (!isDatabaseConfigured()) return databaseUnavailable();
  const pathname = new URL(request.url).pathname;
  if (pathname.endsWith("/sign-in/email") || pathname.endsWith("/sign-up/email")) {
    const limit = rateLimit(request, "auth-email", 10, 15 * 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  }
  return handler.POST(request);
}
