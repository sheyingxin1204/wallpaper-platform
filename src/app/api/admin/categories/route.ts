import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { createCategory, listCategories } from "@/lib/taxonomy/service";
import { createCategorySchema } from "@/lib/taxonomy/schemas";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ categories: await listCategories() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    await createCategory(createCategorySchema.parse(await request.json()));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
