type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(request: Request, name: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${name}:${clientKey(request)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0), retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1) };
  }
  current.count += 1;
  return { allowed: true, remaining: Math.max(limit - current.count, 0), retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json({ error: "请求过于频繁，请稍后再试。" }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}
