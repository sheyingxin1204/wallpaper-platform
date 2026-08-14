import { z } from "zod";

// zod's .url() accepts any scheme; source/license links must only ever be
// http(s) so they can be rendered safely in href attributes.
export const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "链接必须使用 http 或 https 协议。");

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
