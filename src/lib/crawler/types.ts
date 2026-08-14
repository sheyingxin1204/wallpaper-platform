import { z } from "zod";
import { httpUrlSchema } from "@/lib/taxonomy/schemas";

export const crawlCandidateSchema = z.object({
  pageUrl: httpUrlSchema.max(2048),
  imageUrl: httpUrlSchema.max(2048),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  sourceName: z.string().trim().min(1).max(160),
  author: z.string().trim().max(160).optional(),
  license: z.object({
    type: z.string().trim().min(1).max(120),
    evidenceUrl: httpUrlSchema.max(2048).optional(),
    notes: z.string().trim().max(4000).optional(),
  }),
  capturedAt: z.coerce.date().optional(),
});

export type CrawlCandidate = z.infer<typeof crawlCandidateSchema>;

export const crawlManifestSchema = z.object({
  provider: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(40),
  items: z.array(crawlCandidateSchema).min(1),
});

export type CrawlManifest = z.infer<typeof crawlManifestSchema>;

export const selectorPageSchema = z.object({
  url: httpUrlSchema.max(2048),
  sourceName: z.string().trim().min(1).max(160),
  license: z.object({
    type: z.string().trim().min(1).max(120),
    evidenceUrl: httpUrlSchema.max(2048).optional(),
    notes: z.string().trim().max(4000).optional(),
  }),
  itemSelector: z.string().trim().min(1).max(300),
  imageSelector: z.string().trim().min(1).max(300),
  titleSelector: z.string().trim().max(300).optional(),
  authorSelector: z.string().trim().max(300).optional(),
  descriptionSelector: z.string().trim().max(300).optional(),
  maxItems: z.number().int().min(1).max(100).default(40),
  delayMs: z.number().int().min(0).max(10_000).default(500),
});

export const selectorManifestSchema = z.object({
  provider: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(40),
  pages: z.array(selectorPageSchema).min(1).max(20),
});

export type SelectorManifest = z.infer<typeof selectorManifestSchema>;
