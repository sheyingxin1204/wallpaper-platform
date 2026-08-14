import { readFile } from "node:fs/promises";
import { createCrawlTask, finishCrawlTask } from "@/lib/crawler/service";
import { importCrawlCandidates } from "@/lib/crawler/ingest";
import { crawlManifestSchema } from "@/lib/crawler/types";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const manifestPath = argument("--manifest");
  const dryRun = process.argv.includes("--dry-run");
  if (!manifestPath) {
    console.error("Usage: pnpm crawler --manifest <manifest.json> [--dry-run]");
    process.exitCode = 1;
    return;
  }

  const rawInput = await readFile(manifestPath, "utf8");
  const parsed = crawlManifestSchema.safeParse(JSON.parse(rawInput));
  if (!parsed.success) {
    console.error("采集清单格式不合法：", parsed.error.issues);
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log(JSON.stringify({ provider: parsed.data.provider, version: parsed.data.version, candidates: parsed.data.items.length }, null, 2));
    return;
  }

  const taskId = await createCrawlTask({ provider: parsed.data.provider, version: parsed.data.version, rawInput });
  try {
    const result = await importCrawlCandidates(taskId, parsed.data.items);
    await finishCrawlTask({ id: taskId, candidateCount: parsed.data.items.length, ...result });
    console.log(JSON.stringify({ taskId, ...result }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知采集任务错误。";
    await finishCrawlTask({ id: taskId, candidateCount: parsed.data.items.length, importedCount: 0, duplicateCount: 0, error: message });
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
