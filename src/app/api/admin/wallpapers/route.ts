import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { createDraft, getAdminWallpapersPage } from "@/lib/wallpapers/service";

const createDraftSchema = z.object({ title: z.string().trim().min(1).max(200) });

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const result = await getAdminWallpapersPage(Number.isFinite(page) ? page : 1);
    return NextResponse.json({ wallpapers: result.items, hasNext: result.hasNext, page: Math.max(page || 1, 1) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const { title } = createDraftSchema.parse(await request.json());
    const id = await createDraft(admin.id, title);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
