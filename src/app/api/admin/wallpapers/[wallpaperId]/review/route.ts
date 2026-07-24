import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { transitionWallpaper } from "@/lib/wallpapers/service";

const reviewSchema = z.object({ status: z.enum(["published", "unlisted", "rejected"]), reason: z.string().trim().max(4000).optional() });
type Context = { params: Promise<{ wallpaperId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const admin = await requireAdmin();
    const { wallpaperId } = await context.params;
    const input = reviewSchema.parse(await request.json());
    await transitionWallpaper({ id: wallpaperId, actorId: admin.id, toStatus: input.status, reason: input.reason });
    return NextResponse.json({ status: input.status });
  } catch (error) {
    return apiError(error);
  }
}
