import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { updateCategory } from "@/lib/taxonomy/service";
import { updateCategorySchema } from "@/lib/taxonomy/schemas";

type Context = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { categoryId } = await context.params;
    await updateCategory(categoryId, updateCategorySchema.parse(await request.json()));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
