import { z } from "zod";

export const crawlCandidateSchema = z.object({
  pageUrl: z.string().url().max(2048),
  imageUrl: z.string().url().max(2048),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  sourceName: z.string().trim().min(1).max(160),
  author: z.string().trim().max(160).optional(),
  license: z.object({
    type: z.string().trim().min(1).max(120),
    evidenceUrl: z.string().url().max(2048).optional(),
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
