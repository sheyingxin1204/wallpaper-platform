import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth, authConfigurationError } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);

function unavailable() {
  return NextResponse.json({ error: "生产环境必须配置 BETTER_AUTH_SECRET。" }, { status: 503 });
}

export async function GET(request: Request) {
  if (authConfigurationError) return unavailable();
  return handler.GET(request);
}

export async function POST(request: Request) {
  if (authConfigurationError) return unavailable();
  const pathname = new URL(request.url).pathname;
  if (pathname.endsWith("/sign-in/email") || pathname.endsWith("/sign-up/email")) {
    const limit = rateLimit(request, "auth-email", 10, 15 * 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  }
  return handler.POST(request);
}
