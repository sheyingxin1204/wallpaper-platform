import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guard";
import { createTag, listTags } from "@/lib/taxonomy/service";
import { createTagSchema } from "@/lib/taxonomy/schemas";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ tags: await listTags() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    await createTag(createTagSchema.parse(await request.json()));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
