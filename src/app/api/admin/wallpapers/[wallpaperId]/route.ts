import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { getAdminWallpaper, updateDraft } from "@/lib/wallpapers/service";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  source: z.object({ name: z.string().trim().min(1).max(160), originalUrl: z.string().url().max(2048), author: z.string().trim().max(160).optional() }).optional(),
  license: z.object({ type: z.string().trim().min(1).max(120), evidenceUrl: z.string().url().max(2048).optional(), notes: z.string().trim().max(4000).optional() }).optional(),
});
type Context = { params: Promise<{ wallpaperId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    await requireAdmin();
    const { wallpaperId } = await context.params;
    const wallpaper = await getAdminWallpaper(wallpaperId);
    if (!wallpaper) return NextResponse.json({ error: "壁纸不存在。" }, { status: 404 });
    return NextResponse.json({ wallpaper });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const admin = await requireAdmin();
    const { wallpaperId } = await context.params;
    await updateDraft(wallpaperId, admin.id, updateSchema.parse(await request.json()));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
