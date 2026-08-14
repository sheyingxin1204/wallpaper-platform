import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { listAuditLogs } from "@/lib/wallpapers/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const result = await listAuditLogs(Number.isFinite(page) ? page : 1);
    return NextResponse.json({ logs: result.logs, hasNext: result.hasNext, page: Math.max(page || 1, 1) });
  } catch (error) {
    return apiError(error);
  }
}
