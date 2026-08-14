import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { listCrawlTasks } from "@/lib/crawler/service";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ tasks: await listCrawlTasks() });
  } catch (error) {
    return apiError(error);
  }
}
