import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/auth-guard";
import { InfrastructureError } from "@/lib/errors";

export function apiError(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: "请求数据不合法。", details: error.issues }, { status: 400 });
  if (error instanceof InfrastructureError) return NextResponse.json({ error: error.message }, { status: 503 });
  if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ error: "服务器发生未知错误。" }, { status: 500 });
}
