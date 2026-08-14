import { randomUUID } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import { requireDatabase } from "@/db";
import { ConflictError } from "@/lib/errors";
import { categories, tags } from "@/db/schema";

function isDuplicateKeyError(error: unknown) {
  return error instanceof Error && /(duplicate|ER_DUP_ENTRY|1062)/i.test(error.message);
}

export async function listCategories() {
  return requireDatabase()
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function createCategory(input: { name: string; slug: string; sortOrder?: number; enabled?: boolean }) {
  try {
    await requireDatabase().insert(categories).values({
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      sortOrder: input.sortOrder ?? 0,
      enabled: input.enabled ?? true,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ConflictError(`分类 slug “${input.slug}” 已存在。`);
    throw error;
  }
}

export async function updateCategory(id: string, input: { name?: string; slug?: string; sortOrder?: number; enabled?: boolean }) {
  try {
    const result = await requireDatabase().update(categories).set(input).where(eq(categories.id, id));
    if (result.rowsAffected === 0) throw new Error("分类不存在。");
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ConflictError(`分类 slug “${input.slug ?? ""}” 已存在。`);
    throw error;
  }
}

export async function listTags() {
  return requireDatabase().select().from(tags).orderBy(asc(tags.name));
}

export async function createTag(input: { name: string; slug: string }) {
  try {
    await requireDatabase().insert(tags).values({ id: randomUUID(), ...input });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ConflictError(`标签 slug “${input.slug}” 已存在。`);
    throw error;
  }
}

export async function updateTag(id: string, input: { name?: string; slug?: string }) {
  try {
    const result = await requireDatabase().update(tags).set(input).where(eq(tags.id, id));
    if (result.rowsAffected === 0) throw new Error("标签不存在。");
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ConflictError(`标签 slug “${input.slug ?? ""}” 已存在。`);
    throw error;
  }
}

export async function deleteCategory(id: string) {
  const result = await requireDatabase().delete(categories).where(eq(categories.id, id));
  if (result.rowsAffected === 0) throw new Error("分类不存在。");
}

export async function deleteTag(id: string) {
  const result = await requireDatabase().delete(tags).where(eq(tags.id, id));
  if (result.rowsAffected === 0) throw new Error("标签不存在。");
}

export async function assertTagsExist(tagIds: string[]) {
  if (!tagIds.length) return;
  const rows = await requireDatabase()
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.id, tagIds));
  if (rows.length !== new Set(tagIds).size) throw new Error("包含不存在的标签。");
}

export async function assertCategoryExists(categoryId: string) {
  const [row] = await requireDatabase()
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  if (!row) throw new Error("分类不存在。");
}
