import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { requireDatabase } from "@/db";
import { crawlRecords, crawlTasks } from "@/db/schema";
import type { CrawlCandidate } from "@/lib/crawler/types";

export function computeTaskInputHash(rawInput: string) {
  return createHash("sha256").update(rawInput).digest("hex");
}

export async function createCrawlTask(input: { provider: string; version: string; rawInput?: string; inputHash?: string }) {
  // If a previous run with the same manifest is still marked as running, it
  // likely crashed mid-way (the workflow concurrency guard prevents parallel
  // runs). Reuse that task so a retry does not duplicate records.
  if (input.inputHash) {
    const [existing] = await requireDatabase()
      .select({ id: crawlTasks.id })
      .from(crawlTasks)
      .where(sql`${crawlTasks.inputHash} = ${input.inputHash} AND ${crawlTasks.status} = 'running'`)
      .limit(1);
    if (existing) return existing.id;
  }
  const id = randomUUID();
  await requireDatabase().insert(crawlTasks).values({
    id,
    provider: input.provider,
    providerVersion: input.version,
    input: input.rawInput,
    inputHash: input.inputHash,
    startedAt: new Date(),
  });
  return id;
}

export async function createCrawlRecord(taskId: string, candidate: CrawlCandidate) {
  const id = randomUUID();
  await requireDatabase().insert(crawlRecords).values({
    id,
    taskId,
    pageUrl: candidate.pageUrl,
    imageUrl: candidate.imageUrl,
    title: candidate.title,
    author: candidate.author,
    licenseType: candidate.license.type,
    licenseEvidenceUrl: candidate.license.evidenceUrl,
    licenseNotes: candidate.license.notes,
    capturedAt: candidate.capturedAt ?? new Date(),
  });
  return id;
}

export async function markCrawlRecordImported(input: { id: string; wallpaperId: string; sourceSha256: string }) {
  await requireDatabase().update(crawlRecords).set({ status: "imported", wallpaperId: input.wallpaperId, sourceSha256: input.sourceSha256 }).where(eq(crawlRecords.id, input.id));
}

export async function markCrawlRecordDuplicate(input: { id: string; wallpaperId: string; sourceSha256: string }) {
  await requireDatabase().update(crawlRecords).set({ status: "duplicate", wallpaperId: input.wallpaperId, sourceSha256: input.sourceSha256 }).where(eq(crawlRecords.id, input.id));
}

export async function markCrawlRecordFailed(id: string, error: string) {
  await requireDatabase().update(crawlRecords).set({ status: "failed", error: error.slice(0, 4000) }).where(eq(crawlRecords.id, id));
}

export async function finishCrawlTask(input: { id: string; candidateCount: number; importedCount: number; duplicateCount: number; error?: string }) {
  await requireDatabase()
    .update(crawlTasks)
    .set({
      status: input.error ? "failed" : "completed",
      candidateCount: input.candidateCount,
      importedCount: input.importedCount,
      duplicateCount: input.duplicateCount,
      error: input.error?.slice(0, 4000),
      finishedAt: new Date(),
    })
    .where(eq(crawlTasks.id, input.id));
}

export async function incrementCrawlTaskCandidateCount(taskId: string) {
  await requireDatabase().update(crawlTasks).set({ candidateCount: sql`${crawlTasks.candidateCount} + 1` }).where(eq(crawlTasks.id, taskId));
}

export async function listCrawlTasks(limit = 50) {
  return requireDatabase()
    .select()
    .from(crawlTasks)
    .orderBy(desc(crawlTasks.startedAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function listCrawlRecords(taskId: string, limit = 200) {
  return requireDatabase()
    .select()
    .from(crawlRecords)
    .where(eq(crawlRecords.taskId, taskId))
    .orderBy(desc(crawlRecords.createdAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}
