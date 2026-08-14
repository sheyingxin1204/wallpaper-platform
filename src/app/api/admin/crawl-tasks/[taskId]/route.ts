import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { listCrawlRecords } from "@/lib/crawler/service";

type Context = { params: Promise<{ taskId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    await requireAdmin();
    const { taskId } = await context.params;
    return NextResponse.json({ records: await listCrawlRecords(taskId) });
  } catch (error) {
    return apiError(error);
  }
}
