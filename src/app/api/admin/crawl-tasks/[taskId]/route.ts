import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { listCrawlRecords } from "@/lib/crawler/service";

type Context = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { taskId } = await context.params;
    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const result = await listCrawlRecords(taskId, Number.isFinite(page) ? page : 1);
    return NextResponse.json({ records: result.records, hasNext: result.hasNext, page: Math.max(page || 1, 1) });
  } catch (error) {
    return apiError(error);
  }
}
