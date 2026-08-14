import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字和连字符。")
  .max(100);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema,
  sortOrder: z.number().int().min(0).max(10000).optional(),
  enabled: z.boolean().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  slug: slugSchema.optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  enabled: z.boolean().optional(),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema,
});

export const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  slug: slugSchema.optional(),
});
