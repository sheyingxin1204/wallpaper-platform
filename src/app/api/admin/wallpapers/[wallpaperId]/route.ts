import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { deleteWallpaper, getAdminWallpaper, updateDraft } from "@/lib/wallpapers/service";
import { httpUrlSchema } from "@/lib/taxonomy/schemas";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  source: z.object({ name: z.string().trim().min(1).max(160), originalUrl: httpUrlSchema.max(2048), author: z.string().trim().max(160).optional() }).optional(),
  license: z.object({ type: z.string().trim().min(1).max(120), evidenceUrl: httpUrlSchema.max(2048).optional(), notes: z.string().trim().max(4000).optional() }).optional(),
  categoryId: z.string().trim().min(1).max(36).nullable().optional(),
  tagIds: z.array(z.string().trim().min(1).max(36)).max(20).optional(),
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
    const existing = await getAdminWallpaper(wallpaperId);
    if (!existing) return NextResponse.json({ error: "壁纸不存在。" }, { status: 404 });
    const input = updateSchema.parse(await request.json());
    if (existing.status !== "draft") {
      // Published and pending-review items may only correct attribution data;
      // content edits must go through a draft/review cycle.
      const allowed = { source: input.source, license: input.license };
      await updateDraft(wallpaperId, admin.id, { title: existing.title, source: allowed.source, license: allowed.license });
    } else {
      await updateDraft(wallpaperId, admin.id, input);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    await requireAdmin();
    const { wallpaperId } = await context.params;
    await deleteWallpaper(wallpaperId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
