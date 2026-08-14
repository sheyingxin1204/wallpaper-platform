import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { listAuditLogs } from "@/lib/wallpapers/service";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ logs: await listAuditLogs() });
  } catch (error) {
    return apiError(error);
  }
}
