import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { deleteTag, updateTag } from "@/lib/taxonomy/service";
import { updateTagSchema } from "@/lib/taxonomy/schemas";

type Context = { params: Promise<{ tagId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { tagId } = await context.params;
    await updateTag(tagId, updateTagSchema.parse(await request.json()));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    await requireAdmin();
    const { tagId } = await context.params;
    await deleteTag(tagId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
